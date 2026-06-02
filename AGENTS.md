# AGENTS.md — Heimdall

This file is for autonomous coding agents (Claude Code, Codex, OpenCode, etc.).
Human-friendly intro is in `README.md`. Deep AI context is in `CLAUDE.md`.

## Canonical routing
- This checkout (`/Users/reidar/Projectos/Heimdall`, repo `Reedtrullz/Heimdall`) is the canonical THORChain dashboard.
- The older `THORNode Watcher` / BondTrack checkout is archive-only. Do not implement features, fixes, docs, CI, or deployments there unless explicitly recovering historical artifacts.
- Keep Heimdall branding. Do not rename the product back to BondTrack.

## Golden rules
1. **One CI workflow only.** Edit `.github/workflows/ci.yml`. Do not create
   a second workflow with `name: "CI/CD Pipeline"` or `name: "CI"`.
2. **One Dockerfile only.** Edit `Dockerfile`. Do not create `Dockerfile.v2`,
   `Dockerfile-simple`, etc. — they exist only as historical cache-bust hacks
   and are forbidden.
3. **Publish is a job, not a workflow.** It lives inside `ci.yml` as a job
   named `publish` with `needs: [test, build, e2e]`. Don't reintroduce a
   separate `publish.yml` triggered by `workflow_run`.
4. **Image base is `node:22-slim` (glibc).** Don't switch to Alpine — the
   musl variant of `lightningcss` is unreliable.
5. **Run as non-root in the runtime stage.** `USER node`.
6. **Standalone output.** `next.config.ts` sets `output: 'standalone'`; the
   Dockerfile copies `.next/standalone`, `.next/static`, `public`. Don't
   regress to a single-stage build that ships `node_modules` + source.
7. **Liquify upstream paths.** THORNode = `thorchain_api`, Midgard =
   `thorchain_midgard`. The legacy `thorchain_mainnet` path returns HTTP 500
   and is not a valid endpoint. These are baked into `ci.yml` build args.
8. **Proxy path normalisation.** The `/api/thorchain` proxy strips a leading
   `thorchain/` segment before its allowlist regex matches — the frontend
   calls `fetchThornode('/thorchain/nodes')` and `THORNODE_API_URL` already
   ends in `/thorchain`. Don't simplify it away.
9. **Always `force_source: yes` on docker_image pull tasks.** Without it,
   Ansible reports "ok" but skips the pull when `:latest` already exists
   locally — every deploy after the first runs stale code.

## Required commands before pushing
```bash
nvm use            # Node 22, per .nvmrc
npm ci
npm test
npm run build      # mirrors CI's "build" job
```

## Adding a dependency
1. `npm install <pkg>` (commits to `package-lock.json`).
2. If it ships native binaries, add the linux/x64 platform package to the
   `npm install --no-save` line in `Dockerfile` so CI image builds don't fail.

## App Router specifics
- Client components that use `useSearchParams`/`usePathname` must be wrapped
  in `<Suspense>` at the page boundary.
- API proxy routes export `dynamic = 'force-dynamic'`.
- Use `unstable_noStore()` or `revalidate = 0` to opt out of caching when
  responses are user-specific.

## Deployment
Don't deploy from the VPS. Run from your machine:
```bash
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml \
  --vault-password-file ~/.vault_pass.txt
```
The CI publishes the image; Ansible just pulls and swaps containers.

The Inebotten Discord bot is a sibling project with its own repo and
deploy story — see [Reedtrullz/inebotten-discord](https://github.com/Reedtrullz/inebotten-discord)
(`deploy/` directory). It does not belong here.

## Where things live
| Concern | Path |
|---|---|
| App code | `src/` |
| E2E specs | `e2e/` |
| Unit specs | colocated `*.test.ts(x)` |
| Workflows | `.github/workflows/ci.yml` |
| Container | `Dockerfile`, `.dockerignore`, `compose.production.yml` |
| Deploy | `ansible-playbook.yml`, `inventory/`, `group_vars/` |
| Docs (live) | `README.md`, `CLAUDE.md`, `AGENTS.md`, `DEPLOYMENT.md`, `docs/` |
| Docs (archive) | `docs/archive/` — read-only, prior audits |
