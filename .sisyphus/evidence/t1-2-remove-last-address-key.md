## T1.2 evidence

- Removed `LAST_ADDRESS_KEY` from `src/app/page.tsx`.
- Confirmed `OLD_LAST_ADDRESS_KEY` and `BONDTRACK_ADDRESS` remain.
- `npm run lint`: exits 0; existing warnings remain elsewhere in repo.
- `npm test`: initially failed in `src/lib/hooks/__tests__/use-lp-positions.test.ts`, then passed on rerun: 35 files / 169 tests.
- `lsp_diagnostics src/app/page.tsx`: no diagnostics.
