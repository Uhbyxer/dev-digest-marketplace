// Pure scaffold generation for the Contribute page; rules mirror docs/PLUGIN-GUIDELINES.md and scripts/validate.sh.
export interface ScaffoldForm {
  name: string;
  desc: string;
  author: string;
  type: 'skill' | 'agent' | 'command';
  aname: string;
  adesc: string;
  tools: string;
}

export const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const RESERVED = /^anthropic-|^claude-.*-official$/;

export interface Check {
  ok: boolean;
  text: string;
}

export function checks(f: ScaffoldForm): Check[] {
  return [
    { ok: KEBAB.test(f.name), text: 'Plugin name is kebab-case' },
    { ok: !RESERVED.test(f.name), text: 'Plugin name is not reserved (anthropic-*, claude-*-official)' },
    { ok: !!f.desc.trim(), text: 'Plugin description is present' },
    { ok: KEBAB.test(f.aname), text: 'Artifact name is kebab-case' },
    { ok: !!f.adesc.trim(), text: 'Artifact has a description (required frontmatter)' },
    { ok: true, text: 'No version in the marketplace.json entry' },
  ];
}

export function artifactPath(f: ScaffoldForm): string {
  return { skill: `skills/${f.aname}/SKILL.md`, agent: `agents/${f.aname}.md`, command: `commands/${f.aname}.md` }[f.type];
}

/** YAML-safe scalar: quote when the value could be misparsed. */
function yamlScalar(s: string): string {
  return /^[\s>|&*!%@`'"#-]|[:#]\s|:$|\s$/.test(s) || s === '' ? JSON.stringify(s) : s;
}

export interface Output {
  file: string;
  text: string;
}

export function scaffold(f: ScaffoldForm): Output[] {
  const tools = f.tools.split(',').map((x) => x.trim()).filter(Boolean);
  const aPath = artifactPath(f);
  const manifest = { name: f.name, description: f.desc, author: { name: f.author } };
  const entry = { name: f.name, source: `./plugins/${f.name}`, description: f.desc };
  const front =
    `---\nname: ${f.aname}\ndescription: ${yamlScalar(f.adesc)}\n` +
    (tools.length ? `${f.type === 'agent' ? 'tools' : 'allowed-tools'}: ${tools.join(', ')}\n` : '') +
    `---\n\n# ${f.aname}\n\nDescribe what this ${f.type} does.\n`;
  return [
    { file: 'file tree', text: `plugins/${f.name}/\n  .claude-plugin/plugin.json\n  ${aPath}` },
    { file: `plugins/${f.name}/.claude-plugin/plugin.json`, text: JSON.stringify(manifest, null, 2) },
    { file: `plugins/${f.name}/${aPath}`, text: front },
    { file: '.claude-plugin/marketplace.json (entry)', text: JSON.stringify(entry, null, 2) },
  ];
}

export function zipFiles(f: ScaffoldForm): { path: string; content: string }[] {
  const outs = scaffold(f);
  return [
    { path: outs[1].file, content: outs[1].text + '\n' },
    { path: outs[2].file, content: outs[2].text },
    { path: 'marketplace-entry.json', content: outs[3].text + '\n' },
  ];
}
