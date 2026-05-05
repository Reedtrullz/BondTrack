# Next Steps: Heimdall Post-Plan Cleanup & Integration

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Fix remaining issues (health endpoint version, npm vulnerabilities), verify deployment pipeline works, and push all completed work to GitHub.

**Architecture:** Address in order: (1) Fix health endpoint to use VERSION env var, (2) Fix remaining npm vulnerabilities with non-buggy approach, (3) Run integration test (full Ansible deployment), (4) Push all commits to GitHub, (5) Update DEPLOYMENT.md with new features.

**Tech Stack:** Next.js 16, Node.js 22, Ansible 2.20+, GitHub, Docker, Ansible Vault

---

### Task 1: Fix health endpoint to use VERSION env var

**Objective:** Update health endpoint to use VERSION env var (set by Ansible) instead of npm_package_version.

**Files:**
- Modify: `src/app/api/health/route.ts:8`

**Step 1: Read current health endpoint**

Run:
```bash
cat /Users/reidar/Projectos/Heimdall/src/app/api/health/route.ts
```

Expected: Shows `version: process.env.npm_package_version || 'unknown'`

**Step 2: Update to use VERSION env var**

Replace line 8 with:
```typescript
      version: process.env.VERSION || process.env.npm_package_version || 'unknown',
```

**Step 3: Run tests to verify no regressions**

Run:
```bash
cd /Users/reidar/Projectos/Heimdall && source ~/.nvm/nvm.sh && nvm use 20 && npm test
```

Expected: All tests pass.

**Step 4: Commit health endpoint fix**

```bash
cd /Users/reidar/Projectos/Heimdall && git add src/app/api/health/route.ts && git commit -m "fix: health endpoint uses VERSION env var from Ansible"
```

---

### Task 2: Fix remaining npm vulnerabilities (non-buggy approach)

**Objective:** Fix postcss + 1 other vulnerability without triggering npm ENOTEMPTY bugs.

**Files:**
- Modify: `package.json`, `package-lock.json`

**Step 1: Check current vulnerabilities**

Run:
```bash
cd /Users/reidar/Projectos/Heimdall && npm audit
```

Expected: Shows 2 vulnerabilities (postcss moderate, next high).

**Step 2: Manually update next to 16.2.4 in package.json**

Edit `package.json` to change `"next": "^16.2.2"` to `"next": "16.2.4"` (exact version, no caret).

**Step 3: Clean install without bugs**

Run:
```bash
cd /Users/reidar/Projectos/Heimdall && rm -rf node_modules package-lock.json && npm install
```

Expected: Installs next@16.2.4, generates new package-lock.json.

**Step 4: Verify vulnerabilities are fixed**

Run:
```bash
cd /Users/reidar/Projectos/Heimdall && npm audit
```

Expected: "found 0 vulnerabilities".

**Step 5: Run tests to verify no regressions**

Run:
```bash
cd /Users/reidar/Projectos/Heimdall && source ~/.nvm/nvm.sh && nvm use 20 && npm test
```

Expected: All tests pass.

**Step 6: Commit vulnerability fixes**

```bash
cd /Users/reidar/Projectos/Heimdall && git add package.json package-lock.json && git commit -m "fix: resolve postcss and next vulnerabilities (upgrade to next@16.2.4)"
```

---

### Task 3: Run integration test (full Ansible deployment)

**Objective:** Deploy Heimdall to VPS using updated playbook and verify it works.

**Files:**
- None (deployment test)

**Step 1: Run Ansible playbook to deploy Heimdall**

Run:
```bash
cd /Users/reidar/Projectos/Heimdall && /opt/homebrew/bin/ansible-playbook -i inventory/hosts.yml ansible-playbook.yml
```

Expected: All tasks pass, health check succeeds, reports "Heimdall deployed successfully".

**Step 2: Verify site is accessible**

Run:
```bash
curl -s https://bond.thorchain.no/api/health
```

Expected: `{"status":"healthy","version":"latest","timestamp":"..."}` (version should NOT be "unknown").

**Step 3: Verify site returns HTTP 200**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}" https://bond.thorchain.no
```

Expected: 200.

---

### Task 4: Push all commits to GitHub

**Objective:** Push all completed work (8 commits) to GitHub master branch.

**Files:**
- None (git push)

**Step 1: Check all commits to push**

Run:
```bash
cd /Users/reidar/Projectos/Heimdall && git log --oneline origin/master..master
```

Expected: Lists 8 commits (d927d9b, 5842c82, bdc6ca8, ea35dcd, 69ce3a8, f4cec4f, 60aee7d, plus fix commits).

**Step 2: Push to GitHub**

Run:
```bash
cd /Users/reidar/Projectos/Heimdall && git push origin master
```

Expected: All commits pushed successfully.

**Step 3: Verify CI/CD triggers**

Check: GitHub Actions tab shows CI/CD Pipeline triggered by push.

---

### Task 5: Update DEPLOYMENT.md with new features

**Objective:** Document Vault, Inebotten playbook, and rollback features in DEPLOYMENT.md.

**Files:**
- Modify: `DEPLOYMENT.md`

**Step 1: Read current DEPLOYMENT.md**

Run:
```bash
cat /Users/reidar/Projectos/Heimdall/DEPLOYMENT.md
```

**Step 2: Add sections for new features**

Add after "## Deployment Steps":

```markdown
### Environment Variables

The playbook supports configurable environment variables:
- `NEXT_PUBLIC_THORNODE_API` - THORNode API endpoint
- `NEXT_PUBLIC_MIDGARD_API` - Midgard API endpoint
- `VERSION` - Set to git SHA via `GITHUB_SHA` env var (or "latest")

Set via Ansible vars:
```bash
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml -e "thornode_api=https://custom-api.com"
```

### Sensitive Variables (Vault)

Sensitive vars (COINAPI_KEY, Discord tokens) stored in Ansible Vault:
- `group_vars/vps/vault.yml` (encrypted)
- Automatically loaded for vps group hosts
- Use `ansible-vault edit group_vars/vps/vault.yml` to update

### Inebotten Deployment

Separate playbook for Inebotten Discord bot:
```bash
ansible-playbook -i inventory/hosts.yml inebotten-playbook.yml
```

Requires env vars: `INEBOTTEN_DISCORD_TOKEN`, `INEBOTTEN_OPENROUTER_API_KEY`.

### Rollback Mechanism

If deployment fails health check:
1. Automatically rolls back to previous container image (if exists)
2. Reports rollback in failure message
3. Uses `previous_image` fact captured before deployment
```

**Step 3: Commit documentation update**

```bash
cd /Users/reidar/Projectos/Heimdall && git add DEPLOYMENT.md && git commit -m "docs: update DEPLOYMENT.md with Vault, Inebotten, rollback features"
```

---

## Plan Review Checklist

- [x] Tasks are sequential and logical (fix code → test → deploy → push → docs)
- [x] Each task is bite-sized (2-5 minutes max)
- [x] File paths are exact (relative to repo root)
- [x] Code examples are complete (copy-pasteable)
- [x] Commands are exact with expected output
- [x] Verification steps included for every task
- [x] DRY, YAGNI, TDD principles applied
- [x] Frequent commits (every task)

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-05-05-heimdall-next-steps.md`.

Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?
