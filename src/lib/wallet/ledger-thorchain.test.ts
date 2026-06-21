import { Buffer } from 'buffer';
import { describe, expect, it, vi } from 'vitest';
import {
  THORCHAIN_LEDGER_DERIVATION_PATH,
  readLedgerThorchainAddressFromTransport,
  serializeLedgerPath,
} from './ledger-thorchain';

const LEDGER_ADDRESS = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';

function okVersion({ locked = false, major = 2 } = {}) {
  return Buffer.from([0, major, 0, 0, locked ? 1 : 0, 0, 0, 0, 0, 0x90, 0x00]);
}

function okAddress(address = LEDGER_ADDRESS) {
  const addressBytes = new TextEncoder().encode(address);
  return Buffer.concat([
    Buffer.alloc(33, 1),
    Buffer.from(addressBytes),
    Buffer.from([0x90, 0x00]),
  ]);
}

describe('ledger-thorchain', () => {
  it('serializes the THORChain Ledger derivation path with the first three parts hardened', () => {
    expect(Array.from(serializeLedgerPath(THORCHAIN_LEDGER_DERIVATION_PATH))).toEqual([
      0x2c, 0x00, 0x00, 0x80,
      0xa3, 0x03, 0x00, 0x80,
      0x00, 0x00, 0x00, 0x80,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ]);
  });

  it('reads a verified THORChain address from a Ledger transport response', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(okVersion())
      .mockResolvedValueOnce(okAddress(LEDGER_ADDRESS.toUpperCase()));
    const transport = {
      close: vi.fn(),
      send,
    };

    const result = await readLedgerThorchainAddressFromTransport(transport, { showOnDevice: true });

    expect(result).toEqual({
      address: LEDGER_ADDRESS,
      appVersion: '2.0.0',
      compressedPublicKey: new Uint8Array(33).fill(1),
    });
    expect(send).toHaveBeenNthCalledWith(1, 0x55, 0x00, 0, 0, Buffer.alloc(0), [0x9000]);
    expect(send).toHaveBeenNthCalledWith(
      2,
      0x55,
      0x04,
      0x01,
      0,
      Buffer.from([
        0x04, 0x74, 0x68, 0x6f, 0x72,
        0x2c, 0x00, 0x00, 0x80,
        0xa3, 0x03, 0x00, 0x80,
        0x00, 0x00, 0x00, 0x80,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]),
      [0x9000]
    );
  });

  it('rejects Ledger address responses that fail THORChain mainnet validation', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(okVersion())
      .mockResolvedValueOnce(okAddress('thor1bad'));

    await expect(readLedgerThorchainAddressFromTransport({
      close: vi.fn(),
      send,
    }, { showOnDevice: true })).rejects.toThrow(
      'Ledger returned an address that is not a valid THORChain mainnet address.'
    );
  });

  it('fails closed when the Ledger is locked or exposes an unsupported THORChain app version', async () => {
    await expect(readLedgerThorchainAddressFromTransport({
      close: vi.fn(),
      send: vi.fn().mockResolvedValue(okVersion({ locked: true })),
    })).rejects.toThrow('Unlock Ledger and open the THORChain app before connecting.');

    await expect(readLedgerThorchainAddressFromTransport({
      close: vi.fn(),
      send: vi.fn().mockResolvedValue(okVersion({ major: 1 })),
    })).rejects.toThrow('Ledger THORChain app version 1.0.0 is not supported by Heimdall.');
  });
});
