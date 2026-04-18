
- `use-watchlist.test.ts` reproduces 5 failures because the fixture addresses are not valid THORChain addresses. The hook's `isValidTHORChainAddress()` guard rejects them during hydration and add/remove calls, so storage stays empty and saved-address checks return false.
- `fee-calculations.test.ts` reproduces 1 failure because the test expects `operatorFee: 2.0` to force `leakagePercent` to `100`, but `calculatePersonalFeeLeakage()` treats operator fees as basis points (`2.0` => `0.02%`). The test should use a realistic >10000 bps input if it wants to exercise the cap.
- Verified `src/components/dashboard/__tests__/churn-out-risk.test.tsx` still passes 18/18 with the current implementation and address truncation/loading timeout behavior.
