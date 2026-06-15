import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddressRequiredState } from './address-required-state';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  removeAddress: vi.fn(),
  clearAddresses: vi.fn(),
  addresses: [] as string[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock('@/lib/hooks/use-watchlist', () => ({
  useWatchlist: () => ({
    addresses: mocks.addresses,
    removeAddress: mocks.removeAddress,
    clearAddresses: mocks.clearAddresses,
  }),
}));

describe('AddressRequiredState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addresses = [];
  });

  it('diagnoses a missing watched address before showing trust boundaries', () => {
    render(<AddressRequiredState onAddressSubmit={vi.fn()} />);

    const diagnosis = screen.getByLabelText('Address required diagnosis');
    const lookup = screen.getByText('Start lookup').closest('div');

    expect(diagnosis).toHaveTextContent('Address required');
    expect(diagnosis).toHaveTextContent('Choose a watched THORChain address to start triage');
    expect(screen.getByText('Public read-only')).toBeInTheDocument();
    expect(screen.getByText('Freshness after lookup')).toBeInTheDocument();
    expect(screen.getByText('Wallet stays separate')).toBeInTheDocument();
    expect(lookup).not.toBeNull();
    expect(diagnosis.compareDocumentPosition(lookup!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('warns that malformed URL addresses are ignored', () => {
    render(<AddressRequiredState invalidUrlAddress onAddressSubmit={vi.fn()} />);

    const diagnosis = screen.getByLabelText('Address required diagnosis');

    expect(diagnosis).toHaveTextContent('Address rejected');
    expect(diagnosis).toHaveTextContent('Malformed address ignored before loading dashboard data');
    expect(diagnosis).toHaveTextContent('did not change the saved dashboard address');
  });

  it('submits a valid address through the provided dashboard handler', async () => {
    const user = userEvent.setup();
    const onAddressSubmit = vi.fn();
    const validAddress = 'thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346';

    render(<AddressRequiredState onAddressSubmit={onAddressSubmit} />);

    await user.type(screen.getByLabelText('THORChain address or THORName'), validAddress);
    await user.click(screen.getByRole('button', { name: 'Lookup' }));

    expect(onAddressSubmit).toHaveBeenCalledWith(validAddress);
  });
});
