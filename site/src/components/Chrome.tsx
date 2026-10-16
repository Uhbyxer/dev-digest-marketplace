import { href } from '../lib/router';
import { useApp } from '../lib/app';

export function Header({ section }: { section: string }) {
  const { catalog, theme, toggleTheme } = useApp();
  const { stars } = catalog.popularity;
  const nav: [string, string, string][] = [
    ['home', 'Search', href.home()],
    ['whats-new', "What's new", href.whatsNew()],
    ['compare', 'Compare', href.compare([])],
    ['contribute', 'Contribute', href.contribute()],
  ];
  return (
    <header className="header">
      <a href={href.home()} className="brand">
        <span className="diamond" aria-hidden="true" />
        dev-digest marketplace
      </a>
      <nav aria-label="Main">
        {nav.map(([key, label, to]) => (
          <a key={key} href={to} aria-current={section === key ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </nav>
      <div className="header-end">
        <a className="mono repo" href={`https://github.com/${catalog.marketplace.repo}`} target="_blank" rel="noopener noreferrer">
          {stars !== null && `★ ${stars} · `}
          {catalog.marketplace.repo}
        </a>
        <button type="button" className="btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  );
}

export function CompareTray({ visible }: { visible: boolean }) {
  const { tray, removeFromTray } = useApp();
  if (!visible || !tray.length) return null;
  const ready = tray.length >= 2;
  return (
    <div className="tray">
      <span className="mute small">Compare</span>
      {tray.map((id) => (
        <span key={id} className="tray-item mono">
          {id}
          <button type="button" aria-label={`Remove ${id}`} onClick={() => removeFromTray(id)}>
            ✕
          </button>
        </span>
      ))}
      <a href={href.compare(tray)} className={`btn primary${ready ? '' : ' disabled'}`} aria-disabled={!ready}>
        Compare {tray.length}
      </a>
    </div>
  );
}

export function Toast() {
  const { toast } = useApp();
  return (
    <div role="status" aria-live="polite">
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export function NotFound({ what }: { what: string }) {
  return (
    <div className="empty">
      <div className="empty-title">{what} not found</div>
      <div>
        It may have been renamed or removed. <a href={href.home()}>Back to search</a>.
      </div>
    </div>
  );
}
