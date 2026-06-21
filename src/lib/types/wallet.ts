export interface KeplrOfflineSigner {
  getAccounts(): Promise<{ pubkey: Uint8Array; address: string; algo: string }[]>;
  signDirect: (
    chainId: string,
    signer: string,
    signDoc: {
      authInfoBytes: Uint8Array;
      bodyBytes: Uint8Array;
      chainId: string;
      accountNumber: number;
    }
  ) => Promise<{
    signed: {
      authInfoBytes: Uint8Array;
      bodyBytes: Uint8Array;
      chainId: string;
      accountNumber: number;
    };
    signature: Uint8Array;
  }>;
}

export interface KeplrInterface {
  enable: (chainId: string) => Promise<void>;
  getChainId: (chainId: string) => Promise<string>;
  getKey: (chainId: string) => Promise<{ bech32Address: string }>;
  getOfflineSigner: (chainId: string) => KeplrOfflineSigner;
  signDirect?: KeplrOfflineSigner['signDirect'];
  sendTx?: (chainId: string, tx: Uint8Array, mode: string) => Promise<Uint8Array>;
}

export interface XdefiThorchainInterface {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export interface VultisigThorchainInterface {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: () => void) => void;
  off?: (event: string, handler: () => void) => void;
  removeListener?: (event: string, handler: () => void) => void;
  addEventListener?: (event: string, handler: () => void) => void;
  removeEventListener?: (event: string, handler: () => void) => void;
}

export interface LedgerThorchainConnection {
  address: string;
  appVersion: string;
  compressedPublicKey: Uint8Array;
}

declare global {
  interface Window {
    keplr?: KeplrInterface;
    xfi?: {
      thorchain?: XdefiThorchainInterface;
    };
    vultisig?: {
      thorchain?: VultisigThorchainInterface;
    };
    thorchain?: VultisigThorchainInterface;
  }
}
