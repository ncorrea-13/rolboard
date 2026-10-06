# Security policy

[Español](SECURITY.es.md)

## Supported versions

Only the latest release and the `main` branch get security fixes, both for the desktop app and the Docker images.

## Reporting a vulnerability

**Don't open a public issue.** Report it privately through [GitHub's private vulnerability reporting](https://github.com/ncorrea-13/rolboard/security/advisories/new).

Include:

- What the issue is and what an attacker could do with it.
- Steps to reproduce, or a proof of concept.
- The affected version and how Rolboard runs (desktop or Docker).

This is a personal project maintained in my spare time. I'll acknowledge the report within a week and keep you posted until it's fixed. Once a fix is released, the advisory is published with credit to you, unless you'd rather stay anonymous.

## Scope

In scope: authentication and sessions, campaign isolation, file uploads, vault reading and note rendering, and the desktop-only endpoints.

Out of scope: issues that need an already compromised machine, and insecure deployments that go against the README (for example `ROLBOARD_USER=0` on rootful Docker, or `TRUST_PROXY_HEADERS=true` without Cloudflare in front).
