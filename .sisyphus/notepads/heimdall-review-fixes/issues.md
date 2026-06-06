# Issues

- Initial `npm run e2e` run had one transient Playwright failure on the portfolio smoke check.
- A direct `npx playwright test` retry failed to start the web server because `next` was not on PATH outside the npm script.
- Local Docker verification is blocked in this environment because `docker` is not installed (`command not found`).
- No new issues encountered for the dashboard layout refactor; unit tests and build passed cleanly.
- `npm run lint` still reports existing repository warnings outside this change; none were introduced by the test move.
- `npm run lint` for this repo still emits pre-existing warnings unrelated to the CORS refactor, so the command does not yet reach a 0-warning state.
- No blocking issues remained for T1.1; the last warning came from `Sidebar`/`MobileMenuButton` callback prop naming and was resolved by renaming to `onCloseAction`/`onClickAction`.
- `/api/pools/[pool]` is upstream-backed and slower to verify by curl than the other proxy routes, so validation focused on the shared-header error paths plus the centralized implementation.
