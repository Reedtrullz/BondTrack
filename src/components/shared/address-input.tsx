import { useState } from 'react';
import { getTHORNameLookup } from '@/lib/api/midgard';

interface AddressInputProps {
  onAddressSubmit: (address: string) => void;
  isLoading?: boolean;
}

export function AddressInput({ onAddressSubmit, isLoading }: AddressInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(false);

  const validateAddress = (input: string): boolean => {
    if (!input.startsWith('thor1')) {
      setError('Address must start with "thor1"');
      return false;
    }
    if (input.length < 42 || input.length > 65) {
      setError('Invalid address length');
      return false;
    }
    setError('');
    return true;
  };

  const resolveTHORName = async (name: string): Promise<string | null> => {
    setResolving(true);
    setError('');
    try {
      const result = await getTHORNameLookup(name);
      if (!result.entry) {
        setError('THORName not found');
        return null;
      }
      setError('');
      return result.entry.owner;
    } catch {
      setError('Failed to resolve THORName');
      return null;
    } finally {
      setResolving(false);
    }
  };

  const validate = async (input: string): Promise<string | null> => {
    const trimmed = input.trim();

    if (!trimmed) {
      setError('Address is required');
      return null;
    }

    // THORName resolution
    if (trimmed.endsWith('.thor')) {
      return resolveTHORName(trimmed);
    }

    // Standard thor1... address validation
    if (validateAddress(trimmed)) {
      return trimmed;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = await validate(value);
    if (address) {
      onAddressSubmit(address);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (error) {
      const trimmed = e.target.value.trim();
      if (trimmed.endsWith('.thor') || trimmed.startsWith('thor1')) {
        setError('');
      }
    }
  };

  const busy = isLoading || resolving;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="thor1... or name.thor"
            className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              error ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
            }`}
            disabled={busy}
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
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
