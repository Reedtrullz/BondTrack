import { afterEach, describe, expect, it, vi } from 'vitest';
import { fromBech32 } from '@cosmjs/encoding';
import { Registry } from '@cosmjs/proto-signing';
import {
  executeBondTransaction,
  executeUnbondTransaction,
  generateBondMemo,
  generateUnbondMemo,
  parseRuneAmountToBaseUnits,
  validateTransactionIntent,
  validateBondAmount,
  validateBondMemoOptions,
  validateThorAddress,
} from './bond';
import {
  RUNE_THORCHAIN_ASSET,
  THORCHAIN_DEPOSIT_GAS_LIMIT,
  THORCHAIN_MSG_DEPOSIT_TYPE_URL,
} from './thorchain-msg-deposit';

const stargateMocks = vi.hoisted(() => ({
  connectWithSigner: vi.fn(),
  signAndBroadcast: vi.fn(),
}));

vi.mock('@cosmjs/stargate', () => ({
  SigningStargateClient: {
    connectWithSigner: stargateMocks.connectWithSigner,
  },
}));

const NODE_ADDRESS = 'thor1qyqszqgpqyqszqgpqyqszqgpqyqszqgp55c9cr';
const PROVIDER_ADDRESS = 'thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2';
const SIGNER_ADDRESS = PROVIDER_ADDRESS;

afterEach(() => {
  vi.clearAllMocks();
  delete window.keplr;
  delete window.xfi;
  delete window.vultisig;
  delete window.thorchain;
});

describe('transaction memo and amount helpers', () => {
  it('keeps a BOND amount out of the provider-address memo slot', () => {
    const node = NODE_ADDRESS;

    expect(generateBondMemo(node)).toBe(`BOND:${node}`);
  });

  it('only includes an advanced provider address in a BOND memo when supplied separately', () => {
    const node = NODE_ADDRESS;
    const provider = PROVIDER_ADDRESS;

    expect(generateBondMemo(node, provider, '1000')).toBe(`BOND:${node}:${provider}:1000`);
  });

  it('preserves valid BOND memo variants for provider and operator fee boundaries', () => {
    const node = NODE_ADDRESS;
    const provider = PROVIDER_ADDRESS;

    expect(generateBondMemo(node)).toBe(`BOND:${node}`);
    expect(generateBondMemo(node, provider)).toBe(`BOND:${node}:${provider}:0`);
    expect(generateBondMemo(node, provider, '')).toBe(`BOND:${node}:${provider}:0`);
    expect(generateBondMemo(node, provider, '0')).toBe(`BOND:${node}:${provider}:0`);
    expect(generateBondMemo(node, provider, '10000')).toBe(`BOND:${node}:${provider}:10000`);
  });

  it('rejects BOND operator fees without a valid provider address', () => {
    expect(validateBondMemoOptions('', '1')).toEqual({
      valid: false,
      error: 'Provider address is required when operator fee is set',
    });
    expect(validateBondMemoOptions('   ', '1000')).toEqual({
      valid: false,
      error: 'Provider address is required when operator fee is set',
    });
    expect(validateBondMemoOptions('thor1bad', '1000')).toEqual({
      valid: false,
      error: 'Provider address must be a valid THORChain address',
    });
  });

  it('rejects malformed or out-of-range BOND operator fees', () => {
    const provider = PROVIDER_ADDRESS;

    expect(validateBondMemoOptions(provider, '10001')).toEqual({
      valid: false,
      error: 'Operator fee must be between 0 and 10000 basis points',
    });
    expect(validateBondMemoOptions(provider, '-1')).toEqual({
      valid: false,
      error: 'Operator fee must be a whole number between 0 and 10000 basis points',
    });
    expect(validateBondMemoOptions(provider, '12.5')).toEqual({
      valid: false,
      error: 'Operator fee must be a whole number between 0 and 10000 basis points',
    });
    expect(validateBondMemoOptions(provider, 'abc')).toEqual({
      valid: false,
      error: 'Operator fee must be a whole number between 0 and 10000 basis points',
    });
    expect(validateBondMemoOptions(provider, '1000abc')).toEqual({
      valid: false,
      error: 'Operator fee must be a whole number between 0 and 10000 basis points',
    });
    expect(validateBondMemoOptions(provider, '   ')).toEqual({
      valid: false,
      error: 'Operator fee must be a whole number between 0 and 10000 basis points',
    });
  });

  it('allows leading-zero BOND operator fees and memo generation preserves the entered digits', () => {
    const node = NODE_ADDRESS;
    const provider = PROVIDER_ADDRESS;

    expect(validateBondMemoOptions(provider, '001')).toEqual({ valid: true });
    expect(generateBondMemo(node, provider, '001')).toBe(`BOND:${node}:${provider}:001`);
  });

  it('converts decimal RUNE amounts to exact 1e8 base units', () => {
    expect(parseRuneAmountToBaseUnits('10')).toBe('1000000000');
    expect(parseRuneAmountToBaseUnits('1.02000001')).toBe('102000001');
    expect(parseRuneAmountToBaseUnits('0.00000001')).toBe('1');
  });

  it('rejects malformed or over-precision RUNE amounts', () => {
    expect(parseRuneAmountToBaseUnits('1.02abc')).toBeNull();
    expect(parseRuneAmountToBaseUnits('1.123456789')).toBeNull();
    expect(parseRuneAmountToBaseUnits('-1')).toBeNull();
  });

  it('generates UNBOND memos in 1e8 base units', () => {
    const node = NODE_ADDRESS;

    expect(generateUnbondMemo(node, '10')).toBe(`UNBOND:${node}:1000000000`);
  });

  it('canonicalizes valid uppercase THORChain addresses in generated memos', () => {
    expect(generateBondMemo(NODE_ADDRESS.toUpperCase(), PROVIDER_ADDRESS.toUpperCase(), '1000')).toBe(
      `BOND:${NODE_ADDRESS}:${PROVIDER_ADDRESS}:1000`
    );
    expect(generateUnbondMemo(NODE_ADDRESS.toUpperCase(), '10')).toBe(`UNBOND:${NODE_ADDRESS}:1000000000`);
  });

  it('validates bond amounts with strict decimal parsing', () => {
    expect(validateBondAmount('1').valid).toBe(true);
    expect(validateBondAmount('1.00000001').valid).toBe(true);
    expect(validateBondAmount('1.02abc').valid).toBe(false);
    expect(validateBondAmount('1.123456789').valid).toBe(false);
    expect(validateBondAmount('0.99999999')).toEqual({
      valid: false,
      error: 'Minimum bond amount is 1 RUNE; wallet/network fees are shown separately',
    });
  });

  it('validates THORChain-looking addresses before signing/memo generation', () => {
    expect(validateThorAddress('thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2').valid).toBe(true);
    expect(validateThorAddress('thor1bad')).toEqual({ valid: false, error: 'Invalid THORChain address format' });
    expect(validateThorAddress('cosmos158qequwhhnggm4ch4psv55yqpxsugf67n62dy2').valid).toBe(false);
  });

  it('rejects tampered BOND and UNBOND transaction intents before wallet adapters run', () => {
    expect(validateTransactionIntent({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '2',
      memo: `UNBOND:${NODE_ADDRESS}:200000000`,
      signerAddress: SIGNER_ADDRESS,
    })).toEqual({
      valid: false,
      error: 'BOND form state does not match the generated memo type',
    });

    expect(validateTransactionIntent({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '2',
      memo: `BOND:${PROVIDER_ADDRESS}`,
      signerAddress: SIGNER_ADDRESS,
    })).toEqual({
      valid: false,
      error: 'BOND memo node does not match the selected node address',
    });

    expect(validateTransactionIntent({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '2',
      memo: `BOND:${NODE_ADDRESS}:${PROVIDER_ADDRESS}:10001`,
      signerAddress: SIGNER_ADDRESS,
    })).toEqual({
      valid: false,
      error: 'Operator fee must be between 0 and 10000 basis points',
    });

    expect(validateTransactionIntent({
      type: 'UNBOND',
      nodeAddress: NODE_ADDRESS,
      amount: '10',
      memo: `UNBOND:${NODE_ADDRESS}:1`,
      signerAddress: SIGNER_ADDRESS,
    })).toEqual({
      valid: false,
      error: 'UNBOND memo amount does not match the requested amount',
    });
  });
});

describe('wallet adapter transaction payloads', () => {
  it('sends Keplr BOND MsgDeposit payloads with base-unit RUNE amounts', async () => {
    const offlineSigner = { getAccounts: vi.fn() };
    window.keplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getChainId: vi.fn().mockResolvedValue('thorchain-1'),
      getKey: vi.fn().mockResolvedValue({ bech32Address: SIGNER_ADDRESS }),
      getOfflineSigner: vi.fn().mockReturnValue(offlineSigner),
    };
    stargateMocks.signAndBroadcast.mockResolvedValue({ code: 0, transactionHash: 'keplr-bond-hash' });
    stargateMocks.connectWithSigner.mockResolvedValue({ signAndBroadcast: stargateMocks.signAndBroadcast });

    const result = await executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '2.5',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'keplr',
    }, SIGNER_ADDRESS);

    expect(result).toEqual({ success: true, txHash: 'keplr-bond-hash' });
    expect(window.keplr.enable).toHaveBeenCalledWith('thorchain-1');
    expect(stargateMocks.connectWithSigner).toHaveBeenCalledWith(
      'https://gateway.liquify.com/chain/thorchain_rpc',
      offlineSigner,
      { registry: expect.any(Registry) }
    );
    expect(stargateMocks.signAndBroadcast).toHaveBeenCalledWith(
      SIGNER_ADDRESS,
      [{
        typeUrl: THORCHAIN_MSG_DEPOSIT_TYPE_URL,
        value: {
          signer: fromBech32(SIGNER_ADDRESS).data,
          memo: `BOND:${NODE_ADDRESS}`,
          coins: [{ asset: RUNE_THORCHAIN_ASSET, amount: '250000000' }],
        },
      }],
      { amount: [], gas: THORCHAIN_DEPOSIT_GAS_LIMIT },
      `BOND:${NODE_ADDRESS}`
    );
  });

  it('sends Keplr UNBOND MsgDeposit payloads with zero transfer amount and memo amount semantics', async () => {
    window.keplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getChainId: vi.fn().mockResolvedValue('thorchain-1'),
      getKey: vi.fn().mockResolvedValue({ bech32Address: SIGNER_ADDRESS }),
      getOfflineSigner: vi.fn().mockReturnValue({ getAccounts: vi.fn() }),
    };
    stargateMocks.signAndBroadcast.mockResolvedValue({ code: 0, transactionHash: 'keplr-unbond-hash' });
    stargateMocks.connectWithSigner.mockResolvedValue({ signAndBroadcast: stargateMocks.signAndBroadcast });

    const result = await executeUnbondTransaction({
      type: 'UNBOND',
      nodeAddress: NODE_ADDRESS,
      amount: '10',
      memo: generateUnbondMemo(NODE_ADDRESS, '10'),
      walletType: 'keplr',
    }, SIGNER_ADDRESS);

    expect(result).toEqual({ success: true, txHash: 'keplr-unbond-hash' });
    expect(stargateMocks.signAndBroadcast).toHaveBeenCalledWith(
      SIGNER_ADDRESS,
      [expect.objectContaining({
        value: expect.objectContaining({
          memo: `UNBOND:${NODE_ADDRESS}:1000000000`,
          signer: fromBech32(SIGNER_ADDRESS).data,
          coins: [{ asset: RUNE_THORCHAIN_ASSET, amount: '0' }],
        }),
      })],
      { amount: [], gas: THORCHAIN_DEPOSIT_GAS_LIMIT },
      `UNBOND:${NODE_ADDRESS}:1000000000`
    );
  });

  it('rejects Keplr chain drift before connecting a signer', async () => {
    window.keplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getChainId: vi.fn().mockResolvedValue('cosmoshub-4'),
      getKey: vi.fn().mockResolvedValue({ bech32Address: SIGNER_ADDRESS }),
      getOfflineSigner: vi.fn().mockReturnValue({ getAccounts: vi.fn() }),
    };

    await expect(executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '2',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'keplr',
    }, SIGNER_ADDRESS)).resolves.toEqual({
      success: false,
      error: 'Keplr is not connected to THORChain mainnet',
    });

    expect(stargateMocks.connectWithSigner).not.toHaveBeenCalled();
    expect(stargateMocks.signAndBroadcast).not.toHaveBeenCalled();
  });

  it('rejects Keplr signer drift before broadcast', async () => {
    window.keplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getChainId: vi.fn().mockResolvedValue('thorchain-1'),
      getKey: vi.fn().mockResolvedValue({ bech32Address: NODE_ADDRESS }),
      getOfflineSigner: vi.fn().mockReturnValue({ getAccounts: vi.fn() }),
    };

    await expect(executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '2',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'keplr',
    }, SIGNER_ADDRESS)).resolves.toEqual({
      success: false,
      error: 'Keplr signer changed before broadcast. Reconnect the wallet and review again.',
    });

    expect(stargateMocks.connectWithSigner).not.toHaveBeenCalled();
    expect(stargateMocks.signAndBroadcast).not.toHaveBeenCalled();
  });

  it('rejects function/type mismatches before wallet adapters run', async () => {
    const request = vi.fn();
    window.xfi = { thorchain: { request } };

    await expect(executeBondTransaction({
      type: 'UNBOND',
      nodeAddress: NODE_ADDRESS,
      amount: '10',
      memo: generateUnbondMemo(NODE_ADDRESS, '10'),
      walletType: 'xdefi',
    }, SIGNER_ADDRESS)).resolves.toEqual({
      success: false,
      error: 'Bond transaction must use a BOND intent',
    });

    await expect(executeUnbondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '10',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'xdefi',
    }, SIGNER_ADDRESS)).resolves.toEqual({
      success: false,
      error: 'Unbond transaction must use an UNBOND intent',
    });

    expect(request).not.toHaveBeenCalled();
  });

  it('rejects tampered memo and invalid signer values before browser wallets run', async () => {
    const request = vi.fn().mockResolvedValue('xdefi-hash');
    window.xfi = { thorchain: { request } };

    await expect(executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '3.25',
      memo: `BOND:${PROVIDER_ADDRESS}`,
      walletType: 'xdefi',
    }, SIGNER_ADDRESS)).resolves.toEqual({
      success: false,
      error: 'BOND memo node does not match the selected node address',
    });

    await expect(executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '3.25',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'xdefi',
    }, 'not-a-thor-address')).resolves.toEqual({
      success: false,
      error: 'Connected wallet must expose a valid THORChain mainnet address',
    });

    expect(request).not.toHaveBeenCalled();
  });

  it('sends XDEFI BOND and UNBOND deposit payloads with fail-closed mocked methods', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'sendTransaction') return 'xdefi-hash';
      throw new Error(`Unexpected XDEFI method: ${method}`);
    });
    window.xfi = { thorchain: { request } };

    await expect(executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '3.25',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'xdefi',
    }, SIGNER_ADDRESS)).resolves.toEqual({ success: true, txHash: 'xdefi-hash' });

    await expect(executeUnbondTransaction({
      type: 'UNBOND',
      nodeAddress: NODE_ADDRESS,
      amount: '10',
      memo: generateUnbondMemo(NODE_ADDRESS, '10'),
      walletType: 'xdefi',
    }, SIGNER_ADDRESS)).resolves.toEqual({ success: true, txHash: 'xdefi-hash' });

    expect(request).toHaveBeenNthCalledWith(1, {
      method: 'sendTransaction',
      params: [{ type: 'BOND', to: NODE_ADDRESS, memo: `BOND:${NODE_ADDRESS}`, amount: '325000000', asset: 'rune' }],
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      method: 'sendTransaction',
      params: [{ type: 'UNBOND', to: NODE_ADDRESS, memo: `UNBOND:${NODE_ADDRESS}:1000000000`, amount: '0', asset: 'rune' }],
    });
  });

  it('accepts structured browser-wallet transaction hash responses', async () => {
    const xdefiRequest = vi.fn().mockResolvedValue({ txHash: 'xdefi-structured-hash' });
    window.xfi = { thorchain: { request: xdefiRequest } };

    await expect(executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '3.25',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'xdefi',
    }, SIGNER_ADDRESS)).resolves.toEqual({
      success: true,
      txHash: 'xdefi-structured-hash',
    });

    const vultisigRequest = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'get_accounts') return [SIGNER_ADDRESS];
      if (method === 'deposit_transaction') return { transactionHash: 'vultisig-structured-hash' };
      throw new Error(`Unexpected Vultisig method: ${method}`);
    });
    window.vultisig = { thorchain: { request: vultisigRequest } };

    await expect(executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '3.25',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'vultisig',
    }, SIGNER_ADDRESS)).resolves.toEqual({
      success: true,
      txHash: 'vultisig-structured-hash',
    });
  });

  it('rejects missing or malformed browser-wallet transaction hashes', async () => {
    const xdefiRequest = vi.fn().mockResolvedValue({ txHash: 123 });
    window.xfi = { thorchain: { request: xdefiRequest } };

    await expect(executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '3.25',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'xdefi',
    }, SIGNER_ADDRESS)).resolves.toEqual({
      success: false,
      error: 'XDEFI returned an invalid transaction hash',
    });

    const vultisigRequest = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'get_accounts') return [SIGNER_ADDRESS];
      if (method === 'deposit_transaction') return { transactionHash: '' };
      throw new Error(`Unexpected Vultisig method: ${method}`);
    });
    window.vultisig = { thorchain: { request: vultisigRequest } };

    await expect(executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '3.25',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'vultisig',
    }, SIGNER_ADDRESS)).resolves.toEqual({
      success: false,
      error: 'Vultisig returned an invalid transaction hash',
    });
  });

  it('sends Vultisig deposit payloads with signer address and zero-transfer UNBOND semantics', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'get_accounts') return [SIGNER_ADDRESS];
      if (method === 'deposit_transaction') return 'vultisig-hash';
      throw new Error(`Unexpected Vultisig method: ${method}`);
    });
    window.vultisig = { thorchain: { request } };

    await expect(executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '1',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'vultisig',
    }, SIGNER_ADDRESS)).resolves.toEqual({ success: true, txHash: 'vultisig-hash' });

    await expect(executeUnbondTransaction({
      type: 'UNBOND',
      nodeAddress: NODE_ADDRESS,
      amount: '10',
      memo: generateUnbondMemo(NODE_ADDRESS, '10'),
      walletType: 'vultisig',
    }, SIGNER_ADDRESS)).resolves.toEqual({ success: true, txHash: 'vultisig-hash' });

    expect(request).toHaveBeenNthCalledWith(1, { method: 'get_accounts' });
    expect(request).toHaveBeenNthCalledWith(2, {
      method: 'deposit_transaction',
      params: [{ type: 'BOND', to: NODE_ADDRESS, memo: `BOND:${NODE_ADDRESS}`, amount: '100000000', asset: 'rune', from_address: SIGNER_ADDRESS }],
    });
    expect(request).toHaveBeenNthCalledWith(3, { method: 'get_accounts' });
    expect(request).toHaveBeenNthCalledWith(4, {
      method: 'deposit_transaction',
      params: [{ type: 'UNBOND', to: NODE_ADDRESS, memo: `UNBOND:${NODE_ADDRESS}:1000000000`, amount: '0', asset: 'rune', from_address: SIGNER_ADDRESS }],
    });
  });

  it('rejects Vultisig signer drift before broadcast', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'get_accounts') return [NODE_ADDRESS];
      if (method === 'deposit_transaction') return 'vultisig-hash';
      throw new Error(`Unexpected Vultisig method: ${method}`);
    });
    window.vultisig = { thorchain: { request } };

    await expect(executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '1',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'vultisig',
    }, SIGNER_ADDRESS)).resolves.toEqual({
      success: false,
      error: 'Vultisig signer changed before broadcast. Reconnect the wallet and review again.',
    });

    expect(request).toHaveBeenCalledWith({ method: 'get_accounts' });
    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ method: 'deposit_transaction' }));
  });

  it('rejects Ledger BOND and UNBOND broadcasts until THORChain MsgDeposit signing is hardware-verified', async () => {
    const expectedError = 'Ledger is connected for THORChain address and balance review only. Heimdall does not broadcast BOND or UNBOND with Ledger until THORChain MsgDeposit signing is hardware-verified.';

    await expect(executeBondTransaction({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '1',
      memo: generateBondMemo(NODE_ADDRESS),
      walletType: 'ledger',
    }, SIGNER_ADDRESS)).resolves.toEqual({ success: false, error: expectedError });

    await expect(executeUnbondTransaction({
      type: 'UNBOND',
      nodeAddress: NODE_ADDRESS,
      amount: '10',
      memo: generateUnbondMemo(NODE_ADDRESS, '10'),
      walletType: 'ledger',
    }, SIGNER_ADDRESS)).resolves.toEqual({ success: false, error: expectedError });

    expect(stargateMocks.connectWithSigner).not.toHaveBeenCalled();
    expect(stargateMocks.signAndBroadcast).not.toHaveBeenCalled();
  });
});
