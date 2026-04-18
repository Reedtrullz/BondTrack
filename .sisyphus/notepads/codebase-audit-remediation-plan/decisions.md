
- Normalize `action` at read-time inside `transaction-composer.tsx` instead of renaming quick-action links or changing internal mode conventions. This keeps existing uppercase state/memo behavior intact while making lowercase URLs hydrate correctly.
- Keep UNBOND amount validation inline in `transaction-composer.tsx` rather than adding a shared helper. The rule is UI-specific, small, and only needs to gate `Sign & Broadcast` alongside existing `canUnbondNode(selectedPosition)` logic.
- Updated only `src/lib/api/midgard.ts` plus a focused serialization test in `src/lib/api/__tests__/midgard.test.ts` to lock the `txType` contract without widening scope into callers or UI flow.
- Keep Yield Guard overbonded checks raw-vs-raw inside `use-bond-positions.ts`: compare `Number(node.total_bond)` against raw `OptimalBondD` so the hook preserves its current API shape and only fixes the unit mismatch at the source.
- Sync `TransactionHistory` route updates with a local-state effect instead of rewriting the component as fully controlled search state. That preserves manual typed search while fixing stale dashboard navigation.
- On `storageKey` changes in `pnl-dashboard.tsx`, reset `manualInitialBond`, `inputValue`, and `isEditing` immediately, then hydrate from the new key only if a valid saved value exists.
- Reorder `RewardsPage` so `safePositions`, `networkApy`, and `weightedApy` are computed before any loading/empty returns. This keeps hook order stable without changing the existing render branches or reward/PnL behavior.

- Changelogs now sync URL params both ways by reading query changes back into component state and only calling `router.replace` when the serialized URL actually differs, which prevents stale UI during back/forward navigation.
- Expanded-state persistence now writes empty arrays too, with a separate hydration flag so an intentional all-collapsed preference survives reloads without triggering the default auto-expand path.
