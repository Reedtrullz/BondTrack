# Transaction Signing

**File**: `bond.ts` (337 lines, 12 exports, 14 functions)

## FUNCTIONS
| Function | Purpose |
|----------|---------|
| `executeBondTransaction` | Sign & broadcast BOND transaction |
| `executeUnbondTransaction` | Sign & broadcast UNBOND transaction |
| `validateBondAmount` | Check min bond payload (1 RUNE; wallet/network fees are separate) |
| `canUnbondNode` | Check node status for unbond eligibility (must be Standby) |
| `generateBondMemo` | Build `BOND:<node>:<provider>:<fee>` memo |
| `generateUnbondMemo` | Build `UNBOND:<node>:<amount>` memo |

## WALLET SUPPORT
| Wallet | Method |
|--------|--------|
| Keplr | `@cosmjs/stargate` SigningStargateClient + `MsgDeposit` |
| XDEFI | `window.xfi.thorchain.request({ method: 'sendTransaction' })` |
| Vultisig | `window.thorchain.request({ method: 'deposit_transaction' })` |

## MEMO FORMAT
```
BOND:<node_address>:<provider_address>:<operator_fee>
UNBOND:<node_address>:<amount_in_1e8>
```

UNBOND uses amount `0` in the actual deposit and encodes the real amount in the memo.

## CONVENTIONS
- Amounts in RUNE (human-readable), converted to 1e8 internally
- THORChain deposit fee: empty fee amount with gas limit `600000000`; wallet surfaces final fee
- Chain ID: shared `THORCHAIN_MAINNET_CHAIN_ID` from `src/lib/thorchain.ts`
- RPC: `https://gateway.liquify.com/chain/thorchain_rpc` (from `ENDPOINTS.rpc` in config)

## ANTI-PATTERNS
- Never call executeBondTransaction without user confirmation
- Never use empty phrase Client — always use wallet signer
- Never skip network mismatch validation
