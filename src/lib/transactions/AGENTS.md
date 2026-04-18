# Transaction Signing

**File**: `bond.ts`

## FUNCTIONS
| Function | Purpose |
|----------|---------|
| `executeBondTransaction` | Sign & broadcast BOND transaction |
| `executeUnbondTransaction` | Sign & broadcast UNBOND transaction |
| `validateBondAmount` | Check min bond (1.02 RUNE) |
| `canUnbondNode` | Check node status for unbond eligibility |
| `generateBondMemo` | Build BOND:+node+provider+fee memo |
| `generateUnbondMemo` | Build UNBOND:+node:+amount memo |

## WALLET SUPPORT
| Wallet | Method |
|--------|--------|
| Keplr | `@cosmjs/stargate` SigningStargateClient |
| XDEFI | `window.xfi.thorchain.request({ method: 'sendTransaction' })` |
| Vultisig | `window.thorchain.request({ method: 'deposit_transaction' })` |

## MEMO FORMAT
```
BOND:<node_address>:<provider_address>:<operator_fee>
UNBOND:<node_address>:<amount_in_1e8>
```

## CONVENTIONS
- Amounts in RUNE (human-readable), converted to 1e8 internally
- Gas fee: 2 RUNE (2000000 in 1e8)
- Chain ID: `thorchain-mainnet-v1`
- RPC: `https://rpc.thorchain.info`

## DEPLOYED UX NOTES

- Transaction entry points must preserve the intended mode (`BOND` vs `UNBOND`) when navigating into the composer.
- The in-page `BOND` and `UNBOND` controls must produce visibly distinct composer states.
- Copy actions should provide visible success feedback, not silent best-effort behavior.
- Current live QA is explicitly focused on non-wallet transaction UX first; browser wallet connectivity can be deferred when requested.

## ANTI-PATTERNS
- Never call executeBondTransaction without user confirmation
- Never use empty phrase Client — always use wallet signer
- Never skip network mismatch validation
