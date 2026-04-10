import { useState, useEffect } from 'react';

export interface Wallet {
  address: string;
  chainId: string;
  name: 'keplr' | 'xdefi' | 'vultisig';
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectKeplr = async () => {
    try {
      if (!window.keplr) {
        throw new Error('Keplr wallet not found');
      }
      
      const chainId = 'thorchain-mainnet-v1';
      await window.keplr.enable(chainId);
      
      const offlineSigner = window.keplr.getOfflineSigner(chainId);
      const accounts = await offlineSigner.getAccounts();
      
      setWallet({
        address: accounts[0].address,
        chainId,
        name: 'keplr'
      });
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Keplr');
    }
  };

  const connectXdefi = async () => {
    try {
      if (!window.xfi?.thorchain) {
        throw new Error('XDEFI wallet not found');
      }
      
      const accounts = await window.xfi.thorchain.request({ method: 'eth_accounts' });
      
      setWallet({
        address: accounts[0],
        chainId: 'thorchain-mainnet-v1',
        name: 'xdefi'
      });
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect XDEFI');
    }
  };

  const disconnect = () => {
    setWallet(null);
    setIsConnected(false);
    setError(null);
  };

  useEffect(() => {
    const checkExistingConnection = () => {
      if (window.keplr) {
        connectKeplr();
      } else if (window.xfi?.thorchain) {
        connectXdefi();
      }
    };

    checkExistingConnection();
  }, []);

  return {
    wallet,
    isConnected,
    error,
    connectKeplr,
    connectXdefi,
    disconnect
  };
};