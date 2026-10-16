import { lazy, Suspense } from 'react';
import { useApp } from '../lib/app';
import { href } from '../lib/router';
import { useCopy } from '../components/bits';
import { NotFound } from '../components/Chrome';

const Markdown = lazy(() => import('../components/Markdown'));

export default function ArtifactPage({ plugin, type, name }: { plugin: string; type: string; name: string }) {
  const { catalog } = useApp();
  const copy = useCopy();
  const a = catalog.artifacts.find((x) => x.plugin === plugin && x.type === type && x.name === name);
  if (!a) return <NotFound what="Artifact" />;
  const pl = catalog.plugins.find((p) => p.id === a.plugin);
  const install = pl?.installCommands.join('\n') ?? '';
  const sourceUrl = `https://github.com/${catalog.marketplace.repo}/blob/main/${a.path}`;
  const plain = a.type === 'hook' || a.type === 'mcp';

  return (
    <>
      <a href={href.plugin(a.plugin)} className="back">
        ← {a.plugin}
      </a>
      <div className="art-head">
        <span className="tag">{a.type}</span>
        <h1 className="title mono light sm">{a.name}</h1>
      </div>
      <p className="lede wide">{a.description}</p>
      <div className="art-layout">
        <div className="panel body">
          {plain ? (
            <pre className="plain">{a.bodyMarkdown}</pre>
          ) : (
            <Suspense fallback={<pre className="plain">{a.bodyMarkdown}</pre>}>
              <Markdown source={a.bodyMarkdown} />
            </Suspense>
          )}
        </div>
        <dl className="meta">
          <div>
            <dt>Plugin</dt>
            <dd className="mono">
              <a href={href.plugin(a.plugin)}>{a.plugin}</a>
            </dd>
          </div>
          <div>
            <dt>Tools</dt>
            <dd className="mono">{a.tools.join(', ') || 'none'}</dd>
          </div>
          <div>
            <dt>Last modified</dt>
            <dd className="mono">{a.lastModified.slice(0, 10)}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd className="mono breakall">
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                {a.path}
              </a>
            </dd>
          </div>
          <button type="button" className="btn primary" onClick={(e) => copy(install, e)}>
            Copy install
          </button>
        </dl>
      </div>
    </>
  );
}
