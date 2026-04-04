import { useState, useCallback } from 'react';

interface AddressInputProps {
  onAddressSubmit: (address: string) => void;
  isLoading?: boolean;
}

export function AddressInput({ onAddressSubmit, isLoading }: AddressInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const validate = (input: string): boolean => {
    if (!input.trim()) {
      setError('Address is required');
      return false;
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate(value)) {
      onAddressSubmit(value.trim());
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (error) validate(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="thor1..."
            className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              error ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
            }`}
            disabled={isLoading}
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={isLoading || !value}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-medium rounded-lg transition"
        >
          {isLoading ? 'Loading...' : 'Lookup'}
        </button>
      </div>
    </form>
  );
}
