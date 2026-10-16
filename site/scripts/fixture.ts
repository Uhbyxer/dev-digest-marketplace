import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Throwaway marketplace tree used by indexer and search tests (not a git repo, on purpose). */
export function makeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'catalog-'));
  const w = (p: string, c: string) => {
    mkdirSync(join(root, p, '..'), { recursive: true });
    writeFileSync(join(root, p), c);
  };
  w('.claude-plugin/marketplace.json', JSON.stringify({
    name: 'fx', owner: { name: 'me' },
    plugins: [
      { name: 'review-kit', source: './plugins/review-kit', description: 'Reviews', category: 'quality' },
      { name: 'ops-kit', source: './plugins/ops-kit', description: 'Ops', category: 'workflow' },
    ],
  }));
  w('plugins/review-kit/.claude-plugin/plugin.json', JSON.stringify({ name: 'review-kit', description: 'Structured PR review', version: '1.2.0', keywords: ['review'] }));
  w('plugins/review-kit/skills/pr-review/SKILL.md', '---\nname: pr-review\ndescription: Review a pull request\nallowed-tools: Read, Grep\n---\n# PR review\n\nWalk the **diff** file by file. See [docs](http://x).\n');
  w('plugins/review-kit/agents/security-reviewer.md', '---\nname: security-reviewer\ndescription: "Audits a diff: injection, secrets"\ntools: Read, Bash(git diff:*)\n---\nYou are a reviewer.\n');
  w('plugins/review-kit/commands/review-pr.md', '---\ndescription: Run a review\n---\n/review-pr\n');
  w('plugins/ops-kit/.claude-plugin/plugin.json', JSON.stringify({ name: 'ops-kit', description: 'Ops tooling' }));
  w('plugins/ops-kit/hooks/hooks.json', JSON.stringify({ hooks: { PostToolUse: [{ matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'npm test' }] }, { matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'npm run lint' }] }] } }));
  w('plugins/ops-kit/.mcp.json', JSON.stringify({ mcpServers: { pg: { command: 'npx', args: ['-y', 'pg-ro'], env: { PASSWORD: 'secret' } } } }));
  w('plugins/ops-kit/scripts/run.sh', '#!/bin/sh\n');
  chmodSync(join(root, 'plugins/ops-kit/scripts/run.sh'), 0o755);
  return root;
}
