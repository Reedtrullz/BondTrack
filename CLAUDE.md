# CLAUDE.md — Heimdall Project Context

## Project Overview
Heimdall is a professional investment command center for THORChain bond providers. Live at https://bond.thorchain.no.

## Tech Stack
- **Framework**: Next.js 16.2.4 (App Router, Turbopack)
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS v4
- **Data Fetching**: SWR
- **Charts**: Recharts
- **Testing**: Vitest (167 unit tests, 34 test files) + Playwright (E2E)
- **Deployment**: Ansible → VPS (GHCR, Docker, Caddy reverse proxy)
- **Security**: Ansible Vault for sensitive variables

## Development Commands
```bash
# Install dependencies (requires Node ≥20)
source ~/.nvm/nvm.sh && nvm use 20 && npm install

# Start development server
npm run dev  # http://localhost:3000

# Run unit tests
npm test  # Vitest

# Run E2E tests (requires dev server running)
npm run e2e  # Playwright

# Build for production
npm run build
```

## Deployment
Push-based deployment from local machine to VPS via Ansible.

### Architecture
```
Developer Push → GitHub → CI/CD Pipeline (test, e2e, build)
                       ↓ (on success)
                  docker-publish.yml
                       ↓
                  GHCR (ghcr.io/reedtrullz/heimdall:latest)
                       ↓
                  Local Machine (ansible-playbook)
                       ↓
                  VPS (198.23.137.16)
                       ↓
                  Docker Container (port 3001)
                       ↓
                  Caddy Reverse Proxy (bond.thorchain.no)
```

### Quick Deploy
```bash
# Ensure Ansible is installed (via Homebrew)
brew install ansible

# Run deployment playbook
cd /Users/reidar/Projectos/Heimdall
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml
```

### Features
- **Health Check**: Waits for `/api/health` to return `{"status":"healthy"}`
- **Rollback**: Automatically reverts to previous image on health check failure
- **Vault**: Sensitive vars (COINAPI_KEY, Discord tokens) in `group_vars/vps/vault.yml` (encrypted)
- **Inebotten**: Separate playbook (`inebotten-playbook.yml`) for Discord bot

See [DEPLOYMENT.md](DEPLOYMENT.md) for full details.

## Environment Variables
Set in Ansible playbook (`ansible-playbook.yml`):

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_THORNODE_API` | THORNode API endpoint | `https://gateway.liquify.com/chain/thorchain_api` |
| `NEXT_PUBLIC_MIDGARD_API` | Midgard API endpoint | `https://gateway.liquify.com/chain/thorchain_midgard` |
| `NEXT_PUBLIC_MIDGARD_FALLBACK` | Secondary Midgard fallback | `https://midgard.thorchain.network` |
| `NEXT_PUBLIC_THORCHAIN_RPC` | THORChain RPC | `https://rpc.thorchain.info` |
| `VERSION` | App version (set by Ansible/GitHub SHA) | `latest` |

## Health Endpoint
`/api/health` returns:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-05T20:34:35.609Z",
  "version": "latest"  // or GitHub SHA, or "unknown"
}
```

Version priority: `process.env.VERSION` → `process.env.npm_package_version` → `"unknown"`

Dockerfile passes `VERSION` as ARG/ENV. CI/CD sets it to short SHA (`sha-XXXX`).

## Key Conventions
- **Pages using `useSearchParams`**: Must be `'use client'` and wrapped in `Suspense`
- **API routes**: All proxies use `export const dynamic = 'force-dynamic'`
- **Address persistence**: Unified `BONDTRACK_ADDRESS` localStorage key
- **Testing**: Vitest for unit tests, Playwright for E2E
- **Deployment**: Ansible from local machine (NOT from VPS)

## CI/CD Pipeline
GitHub Actions (`.github/workflows/ci-cd.yml` + `docker-publish.yml`):
- ✅ **test** — Vitest unit tests
- ✅ **build** — Next.js production build
- ✅ **e2e** — Playwright E2E tests
- ✅ **docker-publish** — Build & push to GHCR

All tests must pass before Docker image is published.

## Known Issues
- THORName reverse lookup can return repeated 502s on dashboard routes
- LP Status route degrades honestly when data unavailable
- Some dashboard controls have deployment issues

Fixes are complete only after re-testing on https://bond.thorchain.no.

## Contributing
1. Create feature branch (`git checkout -b feature/amazing-feature`)
2. Make changes
3. Run tests: `npm test` and `npm run e2e`
4. Commit (`git commit -m 'Add amazing feature'`)
5. Push (`git push origin feature/amazing-feature`)
6. Submit pull request

## Security
- Sensitive variables stored in Ansible Vault (`group_vars/vps/vault.yml`)
- Vault password in `~/.vault_pass.txt` (gitignored)
- Never commit real secrets to repository
