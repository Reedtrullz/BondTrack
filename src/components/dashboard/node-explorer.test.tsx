import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NodeExplorer } from './node-explorer';
import type { NodeRaw } from '@/lib/api/thornode';
import type { NodeCandidateScore } from '@/lib/dashboard/node-candidate-score';

const baseNode: NodeRaw & {
  calculatedAPY: number;
  adjustedAPY: number;
  operatorFee: number;
  operatorFeePercent: number;
  totalBond: number;
  candidateScore: NodeCandidateScore;
} = {
  node_address: 'thor1nodecandidate0000000000000000000000000000',
  status: 'Active',
  pub_key_set: {
    secp256k1: 'secp',
    ed25519: 'ed',
  },
  validator_cons_pub_key: 'validator',
  peer_id: 'peer',
  active_block_height: 123,
  status_since: 123,
  node_operator_address: 'thor1operator0000000000000000000000000000000',
  total_bond: '2500000000000',
  bond_providers: {
    node_operator_fee: '0',
    providers: [],
  },
  signer_membership: [],
  requested_to_leave: false,
  forced_to_leave: false,
  leave_height: 0,
  ip_address: '127.0.0.1',
  version: '3.19.0',
  slash_points: 0,
  jail: {},
  current_award: '250000000',
  observe_chains: [],
  preflight_status: { status: 'ok', reason: '', code: 0 },
  maintenance: false,
  missing_blocks: 0,
  calculatedAPY: 10,
  adjustedAPY: 10,
  operatorFee: 0,
  operatorFeePercent: 0,
  totalBond: 25_000,
  candidateScore: {
    score: 82,
    quality: 'Strong',
    trustLabel: 'Capacity known',
    reasons: ['healthy candidate signals'],
  },
};

describe('NodeExplorer', () => {
  it('shows a direct bond action for strong candidates', () => {
    render(
      <NodeExplorer
        nodes={[baseNode]}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByText('Strong · 82/100')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quick Bond/i })).toBeInTheDocument();
  });

  it('does not offer quick bonding for avoid-rated candidates', () => {
    render(
      <NodeExplorer
        nodes={[{
          ...baseNode,
          slash_points: 180,
          candidateScore: {
            score: 24,
            quality: 'Avoid',
            trustLabel: 'Capacity unknown',
            reasons: ['180 slash points'],
          },
        }]}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByText('Avoid · 24/100')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Quick Bond/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review risk first/i })).toBeInTheDocument();
  });
});
