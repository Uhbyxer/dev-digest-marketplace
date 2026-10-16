import { useApp } from '../lib/app';
import { href, replaceHash, type Route } from '../lib/router';
import { useState } from 'react';
import type { Plugin } from '../types';

export default function Compare({ route }: { route: Route }) {
  const { catalog, tray, removeFromTray } = useApp();
  const [hideSame, setHideSame] = useState(false);
  const fromUrl = ['a', 'b', 'c'].map((k) => route.params.get(k)).filter((id): id is string => !!id && catalog.plugins.some((p) => p.id === id));
  const ids = fromUrl.length ? fromUrl : tray;
  const plugins = ids.map((id) => catalog.plugins.find((p) => p.id === id)).filter((p): p is Plugin => !!p);

  if (plugins.length < 2)
    return (
      <>
        <h1 className="title">Compare plugins</h1>
        <p className="mute">
          Select 2–3 plugins with the Compare button on a card or plugin page. <a href={href.home()}>Go to search</a>.
        </p>
      </>
    );

  const names = (p: Plugin, t: string) =>
    catalog.artifacts.filter((a) => a.plugin === p.id && a.type === t).map((a) => a.name).join('\n') || '–';
  const rows: [string, (p: Plugin) => string][] = [
    ['Description', (p) => p.description],
    ['Version', (p) => p.version ?? '–'],
    ['Author', (p) => p.author ?? '–'],
    ['Category', (p) => p.category ?? '–'],
    ['Risk', (p) => p.permissions.risk],
    ['Skills', (p) => names(p, 'skill')],
    ['Agents', (p) => names(p, 'agent')],
    ['Commands', (p) => names(p, 'command')],
    ['Hooks / MCP', (p) => [names(p, 'hook'), names(p, 'mcp')].filter((s) => s !== '–').join('\n') || '–'],
    ['Tools', (p) => [...new Set(catalog.artifacts.filter((a) => a.plugin === p.id).flatMap((a) => a.tools))].join(', ') || '–'],
    ['Last release', (p) => p.releases[0]?.date ?? '–'],
    ['Releases', (p) => String(p.releases.length)],
    ['Activity (90 days)', (p) => `${p.activity90d} commit${p.activity90d === 1 ? '' : 's'}`],
  ];
  const data = rows
    .map(([label, get]) => {
      const cells = plugins.map(get);
      return { label, cells, diff: new Set(cells).size > 1 };
    })
    .filter((r) => !(hideSame && !r.diff));
  const cols = `160px repeat(${plugins.length}, minmax(220px, 1fr))`;

  const remove = (id: string) => {
    removeFromTray(id);
    replaceHash(href.compare(ids.filter((x) => x !== id)));
  };

  return (
    <>
      <h1 className="title">Compare plugins</h1>
      <label className="check-label">
        <input type="checkbox" checked={hideSame} onChange={(e) => setHideSame(e.target.checked)} /> Hide identical rows
      </label>
      <div className="table-wrap">
        <div className="table" role="table" aria-label="Plugin comparison">
          <div className="trow head" role="row" style={{ gridTemplateColumns: cols }}>
            <div role="columnheader" />
            {plugins.map((p) => (
              <div key={p.id} role="columnheader" className="th mono">
                <a href={href.plugin(p.id)}>{p.id}</a>
                <button type="button" aria-label={`Remove ${p.id}`} onClick={() => remove(p.id)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
          {data.map((r) => (
            <div key={r.label} role="row" className={`trow${r.diff ? ' diff' : ''}`} style={{ gridTemplateColumns: cols }}>
              <div role="rowheader" className="td label">
                {r.label}
              </div>
              {r.cells.map((c, i) => (
                <div key={i} role="cell" className="td">
                  {c}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mute small">Rows with differences are tinted.</p>
    </>
  );
}
