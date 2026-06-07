import { useState } from 'react';
import { useTHORName } from '@/lib/hooks/use-thorname';
import { isValidTHORChainAddress } from '@/lib/utils/address-validation';

interface AddressInputProps {
  onAddressSubmit: (address: string) => void;
  isLoading?: boolean;
}

const inputId = 'address-input';
const helpId = 'address-input-help';
const errorId = 'address-input-error';

export function AddressInput({ onAddressSubmit, isLoading }: AddressInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const thorName = value.trim().endsWith('.thor') ? value.trim() : null;
  const { resolved, isLoading: resolving, error: thorError } = useTHORName(thorName);

  const validate = (input: string): string | null => {
    const trimmed = input.trim();

    if (!trimmed) {
      setError('Enter a THORChain address or THORName.');
      return null;
    }

    if (trimmed.endsWith('.thor')) {
      if (resolving) {
        setError('Still resolving that THORName. Try again in a moment.');
        return null;
      }
      if (thorError || !resolved) {
        setError('THORName not found. Check the name and try again.');
        return null;
      }
      setError('');
      return resolved.owner;
    }

    if (!trimmed.startsWith('thor1') && !trimmed.startsWith('tthor1')) {
      setError('Address must start with thor1 or tthor1.');
      return null;
    }

    if (!isValidTHORChainAddress(trimmed)) {
      setError('Enter a valid THORChain address.');
      return null;
    }

    setError('');
    return trimmed;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const address = validate(value);
    if (address) {
      onAddressSubmit(address);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (error) setError('');
  };

  const busy = isLoading || resolving;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <label htmlFor={inputId} className="sr-only">THORChain address or THORName</label>
          <input
            id={inputId}
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="thor1... or name.thor"
            className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              error ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
            }`}
            disabled={busy}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${helpId} ${errorId}` : helpId}
            autoComplete="off"
          />
          <p id={helpId} className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Paste a THORChain mainnet/testnet address or a registered THORName.
          </p>
          <p id={errorId} role="alert" aria-live="polite" className="mt-1 min-h-5 text-sm text-red-500">
            {error}
          </p>
        </div>
        <button
          type="submit"
          disabled={busy || !value}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-medium rounded-lg transition"
        >
          {resolving ? 'Resolving...' : isLoading ? 'Loading...' : 'Lookup'}
        </button>
      </div>
    </form>
  );
}
