import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';
import React from 'react';
import { TransactionHistory } from '../transaction-history';
import * as midgard from '@/lib/api/midgard';

vi.mock('@/lib/api/midgard');

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

describe('TransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resyncs local address state when the prop changes', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as any);

    const { rerender } = render(<TransactionHistory address="ADDR_ONE" />, { wrapper });

    expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('ADDR_ONE');

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith('ADDR_ONE', 50, 'bond,unbond,leave'));

    rerender(<TransactionHistory address="ADDR_TWO" />);

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('ADDR_TWO');
    });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith('ADDR_TWO', 50, 'bond,unbond,leave'));
  });

  it('handles null address prop correctly', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as any);

    const { rerender } = render(<TransactionHistory address={null} />, { wrapper });

    expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Enter a THORChain address to view transaction history')).toBeTruthy();

    rerender(<TransactionHistory address="ADDR_ONE" />);

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('ADDR_ONE');
    });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith('ADDR_ONE', 50, 'bond,unbond,leave'));
  });

  it('updates SWR key when address changes via input', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as any);

    const { rerender } = render(<TransactionHistory address="ADDR_ONE" />, { wrapper });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith('ADDR_ONE', 50, 'bond,unbond,leave'));

    const input = screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ADDR_TWO' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('ADDR_TWO');
    });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith('ADDR_TWO', 50, 'bond,unbond,leave'));
  });

  it('handles empty string address prop correctly', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as any);

    const { rerender } = render(<TransactionHistory address="" />, { wrapper });

    expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Enter a THORChain address to view transaction history')).toBeTruthy();

    rerender(<TransactionHistory address="ADDR_ONE" />);

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('ADDR_ONE');
    });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith('ADDR_ONE', 50, 'bond,unbond,leave'));
  });
});