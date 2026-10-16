import { useState } from 'react';
import { checks, scaffold, zipFiles, type ScaffoldForm } from '../lib/scaffold';
import { downloadBlob, makeZip } from '../lib/zip';
import { useCopy } from '../components/bits';
import { useApp } from '../lib/app';

export default function Contribute() {
  const { catalog } = useApp();
  const copy = useCopy();
  const [f, setF] = useState<ScaffoldForm>({
    name: 'my-plugin',
    desc: 'Helps with code review',
    author: '',
    type: 'skill',
    aname: 'my-skill',
    adesc: 'Reviews code for common issues',
    tools: 'Read, Grep',
  });
  const set = <K extends keyof ScaffoldForm>(k: K, v: ScaffoldForm[K]) => setF((s) => ({ ...s, [k]: v }));
  const cs = checks(f);
  const valid = cs.every((c) => c.ok);
  const outs = scaffold(f);
  const repo = catalog.marketplace.repo;

  const input = (label: string, k: keyof ScaffoldForm, mono = false) => (
    <label className="field">
      {label}
      <input className={mono ? 'mono' : ''} value={f[k]} onChange={(e) => set(k, e.target.value as never)} />
    </label>
  );

  return (
    <>
      <h1 className="title">Contribute a plugin</h1>
      <p className="lede">
        Runs in your browser. No data leaves it. See{' '}
        <a href={`https://github.com/${repo}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer">
          CONTRIBUTING.md
        </a>{' '}
        for the PR steps.
      </p>
      <div className="contribute">
        <div className="form">
          {input('Plugin name', 'name', true)}
          {input('Description', 'desc')}
          {input('Author', 'author')}
          <label className="field">
            Artifact type
            <select value={f.type} onChange={(e) => set('type', e.target.value as ScaffoldForm['type'])}>
              <option value="skill">skill</option>
              <option value="agent">agent</option>
              <option value="command">command</option>
            </select>
          </label>
          {input('Artifact name', 'aname', true)}
          {input('Artifact description', 'adesc')}
          {input('Tools (optional, comma separated)', 'tools', true)}
          <ul className="checks" aria-label="Validation">
            {cs.map((c) => (
              <li key={c.text}>
                <span className={`mono ${c.ok ? 'ok' : 'bad'}`}>{c.ok ? '✓' : '✕'}</span>
                {c.text}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn primary"
            disabled={!valid}
            onClick={() => downloadBlob(`${f.name}-scaffold.zip`, makeZip(zipFiles(f)))}
          >
            Download ZIP
          </button>
        </div>
        <div className="outputs">
          {outs.map((o) => (
            <div key={o.file} className="code out">
              <div className="out-head mono">
                {o.file}
                <button type="button" className="btn small-btn" onClick={(e) => copy(o.text, e)}>
                  Copy
                </button>
              </div>
              <pre>{o.text}</pre>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
