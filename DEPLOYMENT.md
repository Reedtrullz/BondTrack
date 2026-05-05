# Heimdall Deployment Guide

## Overview

Heimdall uses **Ansible** for deployment to the VPS. The workflow is:

```
GitHub (CI/CD) → GHCR (ghcr.io/reedtrullz/heimdall:latest) → VPS (Ansible deployment)
```

## Prerequisites

### On Your Local Machine (Control Node):
- Ansible installed: `pip install ansible`
- SSH access to VPS configured
- SSH key at `~/.ssh/id_rsa_racknerd`

### On VPS (Target Node):
- Docker installed ✓
- GHCR authentication configured ✓
- firewall (UFW) active ✓
- fail2ban running ✓

## Deployment Steps

### 1. Pull Latest Changes
```bash
cd /path/to/Heimdall
git pull origin master
```

### 2. Verify Inventory
Check `inventory/hosts.yml`:
```yaml
vps:
  hosts:
    198.23.137.16:
      ansible_user: deploy
      ansible_ssh_private_key_file: ~/.ssh/id_rsa_racknerd
```

### 3. Run Ansible Playbook
```bash
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml
```

### 4. Verify Deployment
```bash
# Check container health
ssh deploy@198.23.137.16 "docker ps --filter name=heimdall"

# Test health endpoint
curl https://bond.thorchain.no/api/health

# Test homepage
curl -s -o /dev/null -w "%{http_code}" https://bond.thorchain.no
```

### Environment Variables
The playbook supports configurable environment variables:
- `thornode_api` - THORNode API endpoint
- `NEXT_PUBLIC_MIDGARD_API` - Midgard API endpoint
- `VERSION` - Set to git SHA via `GITHUB_SHA` env var (or "latest")

Set via Ansible vars:
```bash
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml -e "thornode_api=https://custom-api.com"
```

### Sensitive Variables (Vault)
Sensitive vars (COINAPI_KEY, Discord token: INEBOTTEN_DISCORD_TOKEN env var) stored in Ansible Vault:
- `group_vars/vps/vault.yml` (encrypted)
- Automatically loaded for vps group hosts
- Use `ansible-vault edit group_vars/vps/vault.yml` to update

### Inebotten Deployment
Separate playbook for Inebotten Discord bot:
```bash
ansible-playbook -i inventory/hosts.yml inebotten-playbook.yml
```

Example with environment variables:
```bash
ansible-playbook -i inventory/hosts.yml inebotten-playbook.yml -e "inebotten_discord_token=xxx" -e "inebotten_openrouter_api_key=yyy"
```

Requires env vars: `INEBOTTEN_DISCORD_TOKEN`, `INEBOTTEN_OPENROUTER_API_KEY`.

### Rollback Mechanism
If deployment fails health check:
1. Automatically rolls back to previous container image (if exists)
2. Reports rollback in failure message
3. Uses `previous_image` fact captured before deployment

## What the Playbook Does

1. Pulls latest `ghcr.io/reedtrullz/heimdall:latest` image
2. Stops and removes existing container
3. Starts new container with:
   - Port mapping: `127.0.0.1:3001:3000`
   - Environment: `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`
   - Healthcheck: Every 30s, 10s timeout, 3 retries
   - Logging: json-file, 10m max size, 3 files
   - Restart policy: unless-stopped

## Rollback (if needed)

```bash
# On VPS:
docker stop heimdall
docker rm heimdall
docker run -d --name heimdall -p 127.0.0.1:3001:3000 \
  --restart unless-stopped \
  -e NODE_ENV=production -e PORT=3000 -e HOSTNAME=0.0.0.0 \
  ghcr.io/reedtrullz/heimdall:latest
```

## Troubleshooting

### Container not healthy?
```bash
ssh deploy@198.23.137.16 "docker logs heimdall"
ssh deploy@198.23.137.16 "docker exec heimdall curl localhost:3000/api/health"
```

### GHCR auth issues?
```bash
# Re-authenticate on VPS:
ssh deploy@198.23.137.16
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u Reedtrullz --password-stdin
```

### Ansible connection issues?
```bash
# Test SSH connection:
ansible -i inventory/hosts.yml vps -m ping
```
