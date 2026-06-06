# Heimdall Deployment Guide

## Architecture

```
Local push → GitHub → CI workflow (test, build, e2e, publish)
                              ↓
                   GHCR: ghcr.io/reedtrullz/heimdall:sha-<short>
                              ↓
                   ansible-playbook from local machine
                              ↓
                   VPS pulls image → swaps container → /api/health probe
                              ↓
                   Caddy proxy (https://bond.thorchain.no)
```

The VPS is a *target*, never a *source*. Don't `git pull` on it; don't build
images on it. CI builds, GHCR stores, Ansible deploys.

## Prerequisites

### Local (control node)
- Ansible: `brew install ansible`
- SSH key at `~/.ssh/id_rsa_racknerd`
- Vault password at `~/.vault_pass.txt` (gitignored)

### VPS (managed node)
- Docker
- GHCR pull credentials (read:packages PAT) — `docker login ghcr.io` already done
- UFW + fail2ban (already configured)

## Deploy

```bash
cd /Users/reidar/Projectos/Heimdall
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml
```

The playbook:
1. Records the currently-running image ID/digest/reference (for rollback)
2. Pulls `ghcr.io/reedtrullz/heimdall:sha-<local short sha>` by default, or `ghcr.io/reedtrullz/heimdall:$IMAGE_TAG` when `IMAGE_TAG` is set and matches `sha-[0-9a-f]{7,40}`
3. Stops + removes old container
4. Starts new container with env vars from playbook + vault
5. Polls `/api/health` until healthy (or rolls back)
6. Sets runtime `VERSION` to the immutable image tag deployed

### Override variables
```bash
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml \
  -e "thornode_api=https://custom-thornode.example.com"
```

### Force a specific immutable tag
The playbook does not default to `:latest`. To deploy an exact published SHA tag:
```bash
IMAGE_TAG=sha-490cac0 ansible-playbook -i inventory/hosts.yml ansible-playbook.yml
```

Use the exact short SHA tag published by CI. The playbook rejects mutable deploy
tags such as `latest`.

`compose.production.yml` is a manual/diagnostic fallback, not the normal release
path. It requires `IMAGE_SHA=<exact-short-sha>` and derives both the image tag
and runtime `VERSION` as `sha-$IMAGE_SHA`; do not use it with mutable tags.

## Verify

```bash
# Container status
ssh deploy@198.23.137.16 "docker ps --filter name=heimdall --format '{{.Status}} {{.Image}}'"

# Health endpoint
curl -s https://bond.thorchain.no/api/health | jq

# Exact deployed image/version check; image tag and health version should match.
ssh deploy@198.23.137.16 "docker ps --filter name=heimdall --format '{{.Image}}'"
curl -s https://bond.thorchain.no/api/health | jq -r .version

# Homepage
curl -s -o /dev/null -w "%{http_code}\n" https://bond.thorchain.no
```

## Rollback

Automatic: the playbook captures the previous image ID/digest/reference before
swapping and restores it if the health check fails.

Manual:
```bash
ssh deploy@198.23.137.16
docker stop heimdall && docker rm heimdall
docker run -d --name heimdall --restart unless-stopped \
  -p 127.0.0.1:3001:3000 \
  -e NODE_ENV=production -e PORT=3000 -e HOSTNAME=0.0.0.0 \
  ghcr.io/reedtrullz/heimdall:sha-<previous-short-sha>
```

## Inebotten (Discord bot, sibling project)

Inebotten is a separate project in its own repo:
[Reedtrullz/inebotten-discord](https://github.com/Reedtrullz/inebotten-discord).
Its deploy playbook lives in that repo at `deploy/`. From a checkout of
that repo:

```bash
ansible-playbook -i deploy/inventory/hosts.yml deploy/ansible-playbook.yml \
  --vault-password-file ~/.vault_pass.txt
```

The Inebotten playbook reuses the same VPS, the same `deploy` user, and
the same `~/.vault_pass.txt` password file as Heimdall, but its secrets
(OpenRouter API key) live in `inebotten-discord/deploy/group_vars/vps/vault.yml` —
not in Heimdall's vault.

## Secrets

Stored encrypted in `group_vars/vps/vault.yml`. Vault password lives at
`~/.vault_pass.txt` (gitignored). Edit with:
```bash
ansible-vault edit group_vars/vps/vault.yml
```

## Troubleshooting

**Container unhealthy:**
```bash
ssh deploy@198.23.137.16 "docker logs --tail 100 heimdall"
ssh deploy@198.23.137.16 "docker exec heimdall wget -qO- localhost:3000/api/health"
```

**GHCR auth on VPS:**
```bash
ssh deploy@198.23.137.16
echo "$GHCR_PAT" | docker login ghcr.io -u Reedtrullz --password-stdin
```

**Ansible can't reach VPS:**
```bash
ansible -i inventory/hosts.yml vps -m ping
```

**CI fails on Docker step but local build works:**
- Ensure new dependencies' linux-x64 prebuilts are added to the
  `npm install --no-save` line in `Dockerfile`.
- Don't switch to Alpine. See `CLAUDE.md` "Don't" section.

**Deploy reports "ok" but the live site still runs old code:**
- `community.docker.docker_image` with `source: pull` is idempotent by
  image *name*. The Heimdall playbook pins `force_source: yes` so the selected
  immutable tag is verified in GHCR instead of trusting a cached local image —
  keep it.

**"THORNode API is temporarily unavailable" banner appears:**
- The browser hits `/api/thorchain/thorchain/nodes` (the client prepends
  a `/thorchain` path). The proxy at
  `src/app/api/thorchain/[...path]/route.ts` strips a leading
  `thorchain/` segment before applying its allowlist regex. If you see
  HTTP 403 `Proxy path is not allowed`, that normalisation step regressed.
- The proxy's `THORNODE_API_URL` already ends in `/thorchain`. Don't
  duplicate the segment in env values.
