# Decisions

- Kept the upgrade patch-only: no source changes, only dependency refresh plus verification.
- Used `npm run e2e -- --grep ...` for targeted retry to preserve the npm script PATH/webServer setup.
- For this task, only the Dockerfile needed a change; the health route already reads `process.env.VERSION` and required no code edit.
- Added a workflow comment documenting why the audit gate uses moderate+ and omits dev dependencies.
- Refactored dashboard address persistence from `useSyncExternalStore` to `useState`/`useEffect` while preserving legacy key migration and URL-driven syncing.
- Moved the shared CORS helper into `src/lib/api/cors.ts`; THORNode and Midgard pass `https://bond.thorchain.no` via `extraOrigins`, while health uses the base allowlist only.
- Renamed layout callback props to `onCloseAction` / `onClickAction` to satisfy Next.js client-component serializability diagnostics without changing behavior.
- Kept the security header policy centralized in `src/lib/api/cors.ts` so every proxy response gets the same CORS + security bundle without per-route duplication.
