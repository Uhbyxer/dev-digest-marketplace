# dev-digest-marketplace

Claude Code plugin marketplace for Dev Digest AI.

## Install

```
/plugin marketplace add Uhbyxer/dev-digest-marketplace
/plugin install example-plugin@dev-digest-marketplace
```

## Plugins

| Plugin | Description |
| :- | :- |
| `example-plugin` | Placeholder plugin with one skill |
| `engineering-paved-path` | Shared skills: React, Next.js, Fastify, architecture, testing, security |
| `research-tools` | Read-only `researcher` agent |
| `architecture-review` | Read-only `architecture-reviewer` agent |
| `sdd-engineering` | Spec Driven Development workflow (depends on the three above) |

## Catalog site

Search every plugin, skill, agent, command, hook and MCP server at
<https://uhbyxer.github.io/dev-digest-marketplace/>. The site source is in [`site/`](site/README.md).

## Development

```bash
./scripts/validate.sh                      # validate marketplace and all plugins
claude plugin marketplace add .             # try it locally
./scripts/release.sh <plugin> patch         # cut a release
./scripts/rollback.sh <plugin> <version>    # roll back to a good release
```

The catalog UI is developed separately in [site/](site/README.md).

See [CONTRIBUTING.md](CONTRIBUTING.md), [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md), [docs/RELEASES.md](docs/RELEASES.md), [docs/SECURITY.md](docs/SECURITY.md).
