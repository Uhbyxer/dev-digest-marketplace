export type ArtifactType = 'skill' | 'agent' | 'command' | 'hook' | 'mcp';
export type Risk = 'low' | 'medium' | 'high';

export const ARTIFACT_TYPES: ArtifactType[] = ['skill', 'agent', 'command', 'hook', 'mcp'];

export interface Capability {
  kind: string;
  text: string;
  src: string;
}

export interface Permissions {
  risk: Risk;
  capabilities: Capability[];
}

export interface Release {
  version: string;
  tag: string;
  date: string; // YYYY-MM-DD
  notes: string[];
}

export interface Plugin {
  id: string;
  description: string;
  version: string | null;
  author: string | null;
  category: string | null;
  keywords: string[];
  path: string;
  addedAt: string | null;
  isNew: boolean;
  activity90d: number;
  artifactCounts: Record<ArtifactType, number>;
  releases: Release[];
  permissions: Permissions;
  installCommands: string[];
}

export interface Artifact {
  id: string; // "<plugin>/<type>/<name>"
  type: ArtifactType;
  name: string;
  plugin: string;
  description: string;
  keywords: string[];
  body: string; // plain text, capped at 20 KB, used for search
  bodyMarkdown: string;
  path: string;
  lastModified: string;
  tools: string[];
  risk: Risk;
}

export interface Catalog {
  generatedAt: string;
  commit: string;
  marketplace: { name: string; owner: string; repo: string };
  popularity: { stars: number | null; fetchedAt: string | null };
  plugins: Plugin[];
  artifacts: Artifact[];
}
