import { describe, expect, it } from 'vitest';
import { checks, scaffold, zipFiles, type ScaffoldForm } from '../lib/scaffold';
import { crc32, makeZip } from '../lib/zip';

const form: ScaffoldForm = { name: 'my-plugin', desc: 'D', author: 'me', type: 'skill', aname: 'my-skill', adesc: 'Reviews: code', tools: 'Read, Grep' };

describe('scaffold', () => {
  it('validates names', () => {
    expect(checks(form).every((c) => c.ok)).toBe(true);
    expect(checks({ ...form, name: 'My_Plugin' })[0].ok).toBe(false);
    expect(checks({ ...form, name: 'anthropic-tools' }).some((c) => !c.ok)).toBe(true);
    expect(checks({ ...form, adesc: ' ' }).some((c) => !c.ok)).toBe(true);
  });
  it('generates valid JSON and quotes YAML-unsafe descriptions', () => {
    const [, manifest, artifact, entry] = scaffold({ ...form, desc: 'say "hi"' });
    expect(JSON.parse(manifest.text).description).toBe('say "hi"');
    expect(JSON.parse(entry.text)).not.toHaveProperty('version');
    expect(artifact.text).toContain('description: "Reviews: code"');
    expect(artifact.text).toContain('allowed-tools: Read, Grep');
  });
  it('uses the right file per type', () => {
    expect(scaffold({ ...form, type: 'agent' })[2].file).toBe('plugins/my-plugin/agents/my-skill.md');
    expect(scaffold({ ...form, type: 'agent' })[2].text).toContain('tools: Read, Grep');
    expect(scaffold({ ...form, type: 'command' })[2].file).toBe('plugins/my-plugin/commands/my-skill.md');
  });
});

describe('zip', () => {
  it('crc32 matches the reference value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
  it('writes a well-formed archive', () => {
    const z = makeZip(zipFiles(form));
    const dv = new DataView(z.buffer);
    expect(dv.getUint32(0, true)).toBe(0x04034b50);
    expect(dv.getUint32(z.length - 22, true)).toBe(0x06054b50);
    expect(dv.getUint16(z.length - 22 + 10, true)).toBe(3);
  });
});
