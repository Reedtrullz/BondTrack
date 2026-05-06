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

```bash
ansible-playbook -i inventory/hosts.yml inebotten-playbook.yml \
  -e "inebotten_discord_token=$INEBOTTEN_DISCORD_TOKEN" \
  -e "inebotten_openrouter_api_key=$INEBOTTEN_OPENROUTER_API_KEY"
```

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
