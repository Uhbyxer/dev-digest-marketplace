import { useState } from 'react';
import { useApp } from '../lib/app';
import { href } from '../lib/router';
import { CompareButton, RiskBadge, useCopy } from '../components/bits';
import { NotFound } from '../components/Chrome';

type Tab = 'artifacts' | 'permissions' | 'changelog';

export default function PluginPage({ id }: { id: string }) {
  const { catalog } = useApp();
  const copy = useCopy();
  const [tab, setTab] = useState<Tab>('artifacts');
  const pl = catalog.plugins.find((p) => p.id === id);
  if (!pl) return <NotFound what="Plugin" />;
  const arts = catalog.artifacts.filter((a) => a.plugin === pl.id);
  const install = pl.installCommands.join('\n');
  const repo = catalog.marketplace.repo;
  const tabs: [Tab, string][] = [
    ['artifacts', `Artifacts (${arts.length})`],
    ['permissions', 'Permissions'],
    ['changelog', 'Changelog'],
  ];

  return (
    <>
      <a href={href.home()} className="back">
        ← All results
      </a>
      <div className="plugin-head">
        <h1 className="title mono light">{pl.id}</h1>
        {pl.version && <span className="mono mute pad">v{pl.version}</span>}
        <span className="pad">
          <RiskBadge risk={pl.permissions.risk} />
        </span>
        <span className="push">
          <CompareButton id={pl.id} className="btn solid" />
        </span>
      </div>
      <p className="lede wide">{pl.description}</p>
      <div className="code install">
        <div className="pre">{install}</div>
        <button type="button" className="btn solid" onClick={(e) => copy(install, e)}>
          Copy
        </button>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className="tab" onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'artifacts' &&
        (arts.length ? (
          <div className="list">
            {arts.map((a) => (
              <a key={a.id} className="list-row" href={href.artifact(a.plugin, a.type, a.name)}>
                <span className="mono mute small upper">{a.type}</span>
                <span>
                  <span className="mono medium">{a.name}</span>
                  <br />
                  <span className="mute">{a.description}</span>
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="mute">This plugin has no indexed artifacts yet.</p>
        ))}

      {tab === 'permissions' && (
        <>
          <p className="note">
            Derived from the plugin files at index time. The badge is informational, not a security guarantee. See{' '}
            <a href={`https://github.com/${repo}/blob/main/docs/SECURITY.md`} target="_blank" rel="noopener noreferrer">
              docs/SECURITY.md
            </a>
            .
          </p>
          <div className="stack">
            {(pl.permissions.capabilities.length
              ? pl.permissions.capabilities
              : [{ kind: 'Prompts only', text: 'No tools, hooks, MCP servers or scripts.', src: pl.path + '/' }]
            ).map((c, i) => (
              <div key={i} className="cap">
                <div className="cap-kind">{c.kind}</div>
                <div className="mono cap-text">{c.text}</div>
                <div className="mono mute small">{c.src}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'changelog' &&
        (pl.releases.length ? (
          pl.releases.map((r) => (
            <div key={r.tag} className="release">
              <div className="mono medium">
                v{r.version} <span className="mute light">· {r.date}</span>
              </div>
              <ul>
                {r.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="mute">No releases yet. Releases appear here after <code>scripts/release.sh</code> tags a version.</p>
        ))}
    </>
  );
}
