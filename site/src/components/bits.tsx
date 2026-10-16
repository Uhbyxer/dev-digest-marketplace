import type { ReactNode } from 'react';
import { copyText } from '../lib/clipboard';
import { useApp } from '../lib/app';
import { highlight } from '../search/engine';
import type { Risk } from '../types';

export function Highlight({ text, words }: { text: string; words: string[] }) {
  return (
    <>
      {highlight(text, words).map((p, i) => (p.hit ? <mark key={i}>{p.t}</mark> : <span key={i}>{p.t}</span>))}
    </>
  );
}

export function RiskBadge({ risk, suffix = ' risk' }: { risk: Risk; suffix?: string }) {
  return (
    <span className="risk">
      <span className={`dot ${risk}`} aria-hidden="true" />
      {risk}
      {suffix}
    </span>
  );
}

export function useCopy() {
  const { say } = useApp();
  return async (text: string, e?: { preventDefault(): void; stopPropagation(): void }) => {
    // Buttons inside a card link must not navigate.
    e?.preventDefault();
    e?.stopPropagation();
    say((await copyText(text)) ? 'Copied' : 'Copy failed');
  };
}

export function CompareButton({ id, className = 'btn' }: { id: string; className?: string }) {
  const { tray, toggleTray, say } = useApp();
  const on = tray.includes(id);
  return (
    <button
      type="button"
      className={`${className}${on ? ' on' : ''}`}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!on && tray.length >= 3) say('Compare up to 3 plugins');
        toggleTray(id);
      }}
    >
      {on ? 'In compare ✓' : 'Compare'}
    </button>
  );
}

export function Select({ label, value, onChange, children, className }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  return (
    <select aria-label={label} className={`select ${className ?? ''}`} value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  );
}
