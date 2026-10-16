import { useState } from 'react';
import { useApp } from '../lib/app';
import { href } from '../lib/router';
import { Select } from '../components/bits';

export default function WhatsNew() {
  const { catalog } = useApp();
  const [filter, setFilter] = useState('');
  const feed = catalog.plugins
    .filter((p) => !filter || p.id === filter)
    .flatMap((p) => p.releases.map((r, i) => ({ plugin: p.id, ...r, isNew: p.isNew && i === p.releases.length - 1 })))
    .sort((a, b) => b.date.localeCompare(a.date) || a.plugin.localeCompare(b.plugin));
  const fresh = catalog.plugins.filter((p) => p.isNew && (!filter || p.id === filter));

  return (
    <>
      <h1 className="title">What's new</h1>
      <p className="lede">Releases across all plugins, newest first.</p>
      <Select label="Filter by plugin" value={filter} onChange={setFilter} className="mb">
        <option value="">All plugins</option>
        {catalog.plugins.map((p) => (
          <option key={p.id} value={p.id}>
            {p.id}
          </option>
        ))}
      </Select>

      {fresh.length > 0 && (
        <section aria-label="New plugins" className="fresh">
          <h2 className="h2">New plugins</h2>
          {fresh.map((p) => (
            <div key={p.id} className="feed-row">
              <div className="mono mute small">{(p.addedAt ?? '').slice(0, 10)}</div>
              <div>
                <a className="mono medium" href={href.plugin(p.id)}>
                  {p.id}
                </a>{' '}
                <span className="badge">NEW</span>
                <p className="mute small nomargin">{p.description}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="stack">
        {feed.map((f) => (
          <div key={f.tag} className="feed-row">
            <div className="mono mute small">{f.date}</div>
            <div>
              <a className="mono medium" href={href.plugin(f.plugin)}>
                {f.plugin} v{f.version}
              </a>
              {f.isNew && <span className="badge">NEW</span>}
              <ul className="notes">
                {f.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
        {feed.length === 0 && <p className="mute">No releases yet.</p>}
      </div>
    </>
  );
}
