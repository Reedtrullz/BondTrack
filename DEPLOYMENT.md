# Heimdall Deployment Guide

## Architecture

```
Local push → GitHub → CI workflow (test, build, e2e, publish)
                              ↓
                   GHCR: ghcr.io/reedtrullz/heimdall:latest + :sha-<short>
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
git pull origin master
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml
```

The playbook:
1. Records the currently-running image (for rollback)
2. Pulls `ghcr.io/reedtrullz/heimdall:latest`
3. Stops + removes old container
4. Starts new container with env vars from playbook + vault
5. Polls `/api/health` until healthy (or rolls back)

### Override variables
```bash
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml \
  -e "thornode_api=https://custom-thornode.example.com"
```

### Force a specific tag
The playbook uses `:latest` by default. To pin a SHA:
```bash
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml \
  -e "docker_image=ghcr.io/reedtrullz/heimdall:sha-490cac0"
```

## Verify

```bash
# Container status
ssh deploy@198.23.137.16 "docker ps --filter name=heimdall --format '{{.Status}} {{.Image}}'"

# Health endpoint
curl -s https://bond.thorchain.no/api/health | jq

# Homepage
curl -s -o /dev/null -w "%{http_code}\n" https://bond.thorchain.no
```

## Rollback

Automatic: the playbook captures the previous image hash before swapping and
restores it if the health check fails.

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

Inebotten lives at `/opt/apps/inebotten-discord` on the VPS, with a `.env`
file already in place and its own `docker-compose.yml`. The playbook
delegates to compose rather than recreating the container by hand.

```bash
ansible-playbook -i inventory/hosts.yml inebotten-playbook.yml \
  --vault-password-file ~/.vault_pass.txt
```

What the playbook does:
1. Removes any leftover standalone `inebotten` container from older deploys.
2. `git pull` the source (idempotent; ignored if origin is unreachable so
   an existing checkout still works).
3. Idempotently writes a managed block to `.env`:
   ```
   AI_PROVIDER=openrouter
   OPENROUTER_API_KEY={{ vault_openrouter_api_key }}
   OPENROUTER_MODEL=google/gemma-4-31b-it:free
   ```
   The block is delimited by `# === managed by ansible (heimdall inebotten-playbook) BEGIN/END ===`. Hand-edits between those markers are overwritten on every run; lines outside the block (e.g. `DISCORD_USER_TOKEN`, `CONSOLE_HOST`) are preserved.
4. Drops a `docker-compose.override.yml` that:
   - remaps the bot's web console to `127.0.0.1:8081`, so the host's
     system Caddy can reverse-proxy `bot.reidar.tech` → `localhost:8081`.
   - disables the bundled compose `caddy` service (the host Caddy already
     owns ports 80/443 for `bond.thorchain.no`; bringing up two would conflict).
5. `docker compose up --build` for the `inebotten` service only.
6. Polls `http://127.0.0.1:8081/health` and reports.

The `DISCORD_USER_TOKEN` lives in `/opt/apps/inebotten-discord/.env` outside
the managed block (it's per-user, not deployment config). The
`OPENROUTER_API_KEY` lives in the Heimdall Ansible vault as
`vault_openrouter_api_key` and is injected into `.env` on every deploy.

Verify:
```bash
ssh deploy@198.23.137.16 "docker ps --filter name=inebotten-bot"
ssh deploy@198.23.137.16 "docker logs --tail 20 inebotten-bot | grep -iE 'openrouter|fallback'"
curl -s -o /dev/null -w "%{http_code}\n" https://bot.reidar.tech/
```

If the bot replies with `😅 Beklager, jeg sliter med å svare akkurat nå`,
that's the bridge's "Local fallback response" — meaning the AI provider
is unreachable. Check `AI_PROVIDER`, `OPENROUTER_API_KEY`, and
`OPENROUTER_MODEL` in `/opt/apps/inebotten-discord/.env`, and re-run the
playbook to re-inject them from vault.

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
  image *name*. If `:latest` already exists locally, the pull is skipped
  silently. The Heimdall and Inebotten playbooks pin `force_source: yes`
  for that reason — keep it.

**"THORNode API is temporarily unavailable" banner appears:**
- The browser hits `/api/thorchain/thorchain/nodes` (the client prepends
  a `/thorchain` path). The proxy at
  `src/app/api/thorchain/[...path]/route.ts` strips a leading
  `thorchain/` segment before applying its allowlist regex. If you see
  HTTP 403 `Proxy path is not allowed`, that normalisation step regressed.
- The proxy's `THORNODE_API_URL` already ends in `/thorchain`. Don't
  duplicate the segment in env values.
