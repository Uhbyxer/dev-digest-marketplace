# Security

Plugins can run hooks, scripts and MCP servers on users' machines, so review them like code that ships to production.

## Reporting a vulnerability

Please report privately via GitHub Security Advisories on this repository. Do not open a public issue.

## For contributors

- No secrets, tokens or credentials in the repo.
- Hooks and scripts must not download and execute remote code.
- Pin external plugin sources with `sha` (git) or `sha256` (archive).
