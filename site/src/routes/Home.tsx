import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../lib/app';
import { buildHash, href, replaceHash, type Route } from '../lib/router';
import { parseQuery } from '../search/queryParser';
import { search, suggest } from '../search/engine';
import { ARTIFACT_TYPES, type Artifact, type ArtifactType } from '../types';
import { CompareButton, Highlight, RiskBadge, Select, useCopy } from '../components/bits';

type Sort = 'relevance' | 'updated' | 'name';

export default function Home({ route }: { route: Route }) {
  const { catalog, engine } = useApp();
  const copy = useCopy();
  const p = route.params;
  const q = p.get('q') ?? '';
  const types = (p.get('type') ?? '').split(',').filter((t): t is ArtifactType => ARTIFACT_TYPES.includes(t as ArtifactType));
  const plugin = p.get('plugin') ?? '';
  const category = p.get('category') ?? '';
  const sort = (['relevance', 'updated', 'name'].includes(p.get('sort') ?? '') ? p.get('sort') : 'relevance') as Sort;

  // Search state lives in the URL so results are shareable.
  const setParams = (patch: Record<string, string>) => {
    const next = { q, type: types.join(','), plugin, category, sort: sort === 'relevance' ? '' : sort, ...patch };
    replaceHash(buildHash([], next));
  };

  // The input is local state; URL updates are debounced to 120 ms.
  const [input, setInput] = useState(q);
  const committed = useRef(q);
  useEffect(() => {
    if (q !== committed.current) {
      committed.current = q;
      setInput(q);
    }
  }, [q]);
  useEffect(() => {
    if (input === committed.current) return;
    const t = setTimeout(() => {
      committed.current = input;
      setParams({ q: input });
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  // "/" focuses the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName ?? '')) {
        e.preventDefault();
        document.getElementById('q')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const parsed = useMemo(() => parseQuery(q), [q]);
  const pluginById = useMemo(() => new Map(catalog.plugins.map((pl) => [pl.id, pl])), [catalog.plugins]);
  const hasQuery = parsed.terms.length > 0;

  const results: Artifact[] = useMemo(() => {
    let list = hasQuery ? search(engine, parsed).map((h) => h.artifact) : [...catalog.artifacts];
    list = list.filter(
      (a) => (!types.length || types.includes(a.type)) && (!plugin || a.plugin === plugin) && (!category || pluginById.get(a.plugin)?.category === category),
    );
    const effective = sort === 'relevance' && !hasQuery ? 'updated' : sort;
    if (effective === 'updated') list.sort((x, y) => y.lastModified.localeCompare(x.lastModified) || x.name.localeCompare(y.name));
    else if (effective === 'name') list.sort((x, y) => x.name.localeCompare(y.name));
    // relevance keeps the engine order
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, parsed, hasQuery, catalog.artifacts, pluginById, types.join(), plugin, category, sort]);

  const categories = [...new Set(catalog.plugins.map((pl) => pl.category).filter((c): c is string => !!c))].sort();
  const showHint = !!parsed.hint && !types.includes(parsed.hint);
  const suggestions = results.length === 0 ? suggest(catalog.artifacts, parsed.words) : [];

  return (
    <>
      <h1 className="title">Find a plugin, skill, agent or hook</h1>
      <p className="lede">Search everything in the marketplace. Try “I need a skill for code review”.</p>
      <input
        id="q"
        className="search"
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search…  press / to focus"
        aria-label="Search"
        autoComplete="off"
      />
      <div className="filters">
        {ARTIFACT_TYPES.map((t) => {
          const on = types.includes(t);
          const count = catalog.artifacts.filter((a) => a.type === t && (!plugin || a.plugin === plugin)).length;
          return (
            <button
              key={t}
              type="button"
              className={`pill${on ? ' on' : ''}`}
              aria-pressed={on}
              onClick={() => setParams({ type: (on ? types.filter((x) => x !== t) : [...types, t]).join(',') })}
            >
              {t} <span className="count">{count}</span>
            </button>
          );
        })}
        <Select label="Plugin" value={plugin} onChange={(v) => setParams({ plugin: v })}>
          <option value="">All plugins</option>
          {catalog.plugins.map((pl) => (
            <option key={pl.id} value={pl.id}>
              {pl.id}
            </option>
          ))}
        </Select>
        <Select label="Category" value={category} onChange={(v) => setParams({ category: v })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select label="Sort" className="push" value={sort} onChange={(v) => setParams({ sort: v === 'relevance' ? '' : v })}>
          <option value="relevance">Sort: relevance</option>
          <option value="updated">Sort: recently updated</option>
          <option value="name">Sort: name</option>
        </Select>
      </div>

      <div className="status" aria-live="polite">
        {results.length} result{results.length === 1 ? '' : 's'}
        {!!q && parsed.words.length > 0 && (
          <>
            {' '}
            · searching for <span className="mono ink">{parsed.words.join(' ')}</span>
          </>
        )}
        {showHint && (
          <>
            {' '}
            ·{' '}
            <button type="button" className="linkish" onClick={() => setParams({ type: parsed.hint! })}>
              filter to {parsed.hint}s
            </button>
          </>
        )}
      </div>

      <div className="grid">
        {results.map((a) => {
          const pl = pluginById.get(a.plugin)!;
          return (
            <article key={a.id} className="card">
              <div className="card-top">
                <span className="tag">{a.type}</span>
                <RiskBadge risk={a.risk} />
              </div>
              <h2 className="card-name mono">
                <a className="card-link" href={href.artifact(a.plugin, a.type, a.name)}>
                  <Highlight text={a.name} words={parsed.words} />
                </a>
              </h2>
              <p className="card-desc">
                <Highlight text={a.description} words={parsed.words} />
              </p>
              <div className="kws">
                {a.keywords.slice(0, 3).map((k) => (
                  <span key={k} className="kw">
                    {k}
                  </span>
                ))}
              </div>
              <div className="card-meta mono">
                {a.plugin}
                {pl.version && ` · v${pl.version}`}
                {pl.activity90d > 0 && ` · ${pl.activity90d} commit${pl.activity90d === 1 ? '' : 's'}/90d`}
              </div>
              <div className="card-actions">
                <button type="button" className="btn" onClick={(e) => copy(pl.installCommands.join('\n'), e)}>
                  Copy install
                </button>
                <CompareButton id={a.plugin} />
              </div>
            </article>
          );
        })}
      </div>

      {results.length === 0 && (
        <div className="empty">
          <div className="empty-title">No matches</div>
          <div>
            Searched for <span className="mono">{parsed.words.join(' ') || q}</span>. Nothing close.
            {suggestions.length > 0 && (
              <>
                {' '}
                Did you mean{' '}
                {suggestions.map((s, i) => (
                  <span key={s}>
                    {i > 0 && ', '}
                    <button type="button" className="linkish mono" onClick={() => { setInput(s); }}>
                      {s}
                    </button>
                  </span>
                ))}
                ?
              </>
            )}{' '}
            <a href={href.contribute()}>Contribute one</a>.
          </div>
        </div>
      )}
    </>
  );
}
