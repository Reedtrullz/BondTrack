import { Buffer } from 'buffer';
import { normalizeTHORChainMainnetAddress } from '@/lib/utils/address-validation';

const LEDGER_CLA = 0x55;
const LEDGER_INS_GET_VERSION = 0x00;
const LEDGER_INS_GET_ADDRESS = 0x04;
const LEDGER_P1_RETRIEVE = 0x00;
const LEDGER_P1_SHOW_ON_DEVICE = 0x01;
const LEDGER_STATUS_OK = 0x9000;
const LEDGER_STATUS_APP_NOT_OPEN = 0x6e00;
const LEDGER_STATUS_REJECTED = 0x6986;
const LEDGER_STATUS_DEVICE_BUSY = 0x9001;
const LEDGER_CONNECT_TIMEOUT_MS = 10_000;

export const THORCHAIN_LEDGER_DERIVATION_PATH = [44, 931, 0, 0, 0] as const;
export const LEDGER_BROADCAST_UNAVAILABLE_MESSAGE =
  'Ledger is connected for THORChain address and balance review only. Heimdall does not broadcast BOND or UNBOND with Ledger until THORChain MsgDeposit signing is hardware-verified.';

export interface LedgerBrowserSupport {
  supported: boolean;
  reason: string | null;
}

export interface LedgerAddressResult {
  address: string;
  appVersion: string;
  compressedPublicKey: Uint8Array;
}

interface LedgerTransportLike {
  close(): Promise<void>;
  send(
    cla: number,
    ins: number,
    p1: number,
    p2: number,
    data?: Buffer,
    statusList?: number[]
  ): Promise<Buffer>;
}

interface LedgerTransportWebHidModule {
  default: {
    create(openTimeout?: number, listenTimeout?: number): Promise<LedgerTransportLike>;
  };
}

interface LedgerVersion {
  deviceLocked: boolean;
  major: number;
  minor: number;
  patch: number;
}

export function getLedgerBrowserSupport(): LedgerBrowserSupport {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      supported: false,
      reason: 'Ledger hardware wallets can only connect from a browser.',
    };
  }

  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: 'Ledger requires a secure browser context. Open Heimdall over HTTPS or localhost.',
    };
  }

  if (!('hid' in navigator)) {
    return {
      supported: false,
      reason: 'Ledger requires WebHID. Use Chrome, Edge, Brave, or another Chromium browser with WebHID enabled.',
    };
  }

  return { supported: true, reason: null };
}

export async function connectLedgerThorchainAddress(): Promise<LedgerAddressResult> {
  const support = getLedgerBrowserSupport();
  if (!support.supported) {
    throw new Error(support.reason ?? 'Ledger is not available in this browser.');
  }

  ensureLedgerBufferGlobal();

  let transport: LedgerTransportLike | null = null;

  try {
    const TransportWebHID = (await import('@ledgerhq/hw-transport-webhid')) as LedgerTransportWebHidModule;
    transport = await TransportWebHID.default.create(LEDGER_CONNECT_TIMEOUT_MS);

    return await readLedgerThorchainAddressFromTransport(transport, {
      showOnDevice: true,
    });
  } catch (error) {
    throw normalizeLedgerError(error);
  } finally {
    if (transport) {
      await transport.close().catch(() => undefined);
    }
  }
}

export async function readLedgerThorchainAddressFromTransport(
  transport: LedgerTransportLike,
  options: { showOnDevice?: boolean } = {}
): Promise<LedgerAddressResult> {
  const version = await readLedgerVersion(transport);

  if (version.deviceLocked) {
    throw new Error('Unlock Ledger and open the THORChain app before connecting.');
  }

  if (version.major !== 2) {
    throw new Error(`Ledger THORChain app version ${formatLedgerVersion(version)} is not supported by Heimdall.`);
  }

  const response = await transport.send(
    LEDGER_CLA,
    LEDGER_INS_GET_ADDRESS,
    options.showOnDevice ? LEDGER_P1_SHOW_ON_DEVICE : LEDGER_P1_RETRIEVE,
    0,
    Buffer.from(concatBytes(serializeHrp('thor'), serializeLedgerPath(THORCHAIN_LEDGER_DERIVATION_PATH))),
    [LEDGER_STATUS_OK]
  );

  assertLedgerStatus(response);

  if (response.length < 36) {
    throw new Error('Ledger returned an incomplete THORChain address response.');
  }

  const compressedPublicKey = Uint8Array.from(response.slice(0, 33));
  const rawAddress = new TextDecoder().decode(response.slice(33, -2));
  const address = normalizeTHORChainMainnetAddress(rawAddress);

  if (!address) {
    throw new Error('Ledger returned an address that is not a valid THORChain mainnet address.');
  }

  return {
    address,
    appVersion: formatLedgerVersion(version),
    compressedPublicKey,
  };
}

export function serializeLedgerPath(path: readonly number[]): Uint8Array {
  if (path.length !== 5) {
    throw new Error('Ledger THORChain derivation path must contain 5 parts.');
  }

  const bytes = new Uint8Array(20);
  path.forEach((part, index) => {
    const hardened = index < 3 ? 0x80000000 : 0;
    writeUint32LE(bytes, index * 4, hardened + part);
  });
  return bytes;
}

async function readLedgerVersion(transport: LedgerTransportLike): Promise<LedgerVersion> {
  const response = await transport.send(
    LEDGER_CLA,
    LEDGER_INS_GET_VERSION,
    0,
    0,
    Buffer.alloc(0),
    [LEDGER_STATUS_OK]
  );

  assertLedgerStatus(response);

  if (response.length < 7) {
    throw new Error('Ledger returned an incomplete THORChain app version response.');
  }

  return {
    deviceLocked: response[4] === 1,
    major: response[1],
    minor: response[2],
    patch: response[3],
  };
}

function serializeHrp(hrp: string): Uint8Array {
  const hrpBytes = new TextEncoder().encode(hrp);
  const bytes = new Uint8Array(1 + hrpBytes.length);
  bytes[0] = hrpBytes.length;
  bytes.set(hrpBytes, 1);
  return bytes;
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function writeUint32LE(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function readLedgerStatus(response: Uint8Array): number {
  if (response.length < 2) return 0;
  return (response[response.length - 2] << 8) + response[response.length - 1];
}

function assertLedgerStatus(response: Uint8Array) {
  const status = readLedgerStatus(response);
  if (status !== LEDGER_STATUS_OK) {
    throw new Error(getLedgerStatusMessage(status));
  }
}

function getLedgerStatusMessage(status: number): string {
  if (status === LEDGER_STATUS_APP_NOT_OPEN) {
    return 'Open the THORChain app on Ledger before connecting.';
  }
  if (status === LEDGER_STATUS_REJECTED) {
    return 'Ledger address verification was rejected on the device.';
  }
  if (status === LEDGER_STATUS_DEVICE_BUSY) {
    return 'Ledger is busy. Close other wallet apps and try again.';
  }
  return `Ledger returned status 0x${status.toString(16)}.`;
}

function formatLedgerVersion(version: LedgerVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function ensureLedgerBufferGlobal() {
  const globalWithBuffer = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
  if (!globalWithBuffer.Buffer) {
    globalWithBuffer.Buffer = Buffer;
  }
}

function normalizeLedgerError(error: unknown): Error {
  if (error instanceof Error) {
    const statusCode = getStatusCode(error);
    if (statusCode !== null) {
      return new Error(getLedgerStatusMessage(statusCode));
    }

    const message = error.message.trim();
    if (/access denied|user cancelled|denied/i.test(message)) {
      return new Error('Ledger connection was cancelled in the browser.');
    }
    if (/no device|not found/i.test(message)) {
      return new Error('No Ledger device was selected. Connect and unlock Ledger, then try again.');
    }
    if (/hid.*not supported/i.test(message)) {
      return new Error('Ledger requires WebHID. Use Chrome, Edge, Brave, or another Chromium browser with WebHID enabled.');
    }

    return new Error(message || 'Ledger connection failed.');
  }

  return new Error('Ledger connection failed.');
}

function getStatusCode(error: Error): number | null {
  const statusCode = (error as Error & { statusCode?: unknown }).statusCode;
  return typeof statusCode === 'number' ? statusCode : null;
}
