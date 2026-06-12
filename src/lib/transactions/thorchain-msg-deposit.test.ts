import { fromBech32 } from '@cosmjs/encoding';
import { describe, expect, it } from 'vitest';
import {
  createRuneDepositMessage,
  createThorchainSigningRegistry,
  RUNE_THORCHAIN_ASSET,
  ThorchainMsgDepositGeneratedType,
  THORCHAIN_MSG_DEPOSIT_TYPE_URL,
} from './thorchain-msg-deposit';

const SIGNER_ADDRESS = 'thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2';
const NODE_ADDRESS = 'thor16xxh3km6dxka636qg6q7e3us5vlgvhrhjgw245';

describe('THORChain MsgDeposit encoding', () => {
  it('round-trips a BOND deposit message through the generated type', () => {
    const message = createRuneDepositMessage(SIGNER_ADDRESS, `BOND:${NODE_ADDRESS}`, '250000000');
    const encoded = ThorchainMsgDepositGeneratedType.encode(message).finish();
    const decoded = ThorchainMsgDepositGeneratedType.decode(encoded);

    expect(decoded).toEqual({
      signer: fromBech32(SIGNER_ADDRESS).data,
      memo: `BOND:${NODE_ADDRESS}`,
      coins: [{ asset: RUNE_THORCHAIN_ASSET, amount: '250000000' }],
    });
  });

  it('encodes zero-transfer UNBOND messages with amount semantics in the memo', () => {
    const message = createRuneDepositMessage(SIGNER_ADDRESS, `UNBOND:${NODE_ADDRESS}:1000000000`, '0');
    const registry = createThorchainSigningRegistry();
    const encoded = registry.encode({
      typeUrl: THORCHAIN_MSG_DEPOSIT_TYPE_URL,
      value: message,
    });
    const decoded = registry.decode({
      typeUrl: THORCHAIN_MSG_DEPOSIT_TYPE_URL,
      value: encoded,
    });

    expect(decoded).toMatchObject({
      memo: `UNBOND:${NODE_ADDRESS}:1000000000`,
      coins: [{ asset: RUNE_THORCHAIN_ASSET, amount: '0' }],
    });
    expect(decoded.signer).toEqual(fromBech32(SIGNER_ADDRESS).data);
  });
});
