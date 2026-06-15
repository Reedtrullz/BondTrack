import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NodeExplorer } from './node-explorer';
import type { NodeRaw } from '@/lib/api/thornode';
import { getCandidateBondSourceSafety, type CandidateBondSourceSafety } from '@/lib/dashboard/candidate-bond-source-safety';
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
    capacityTrust: 'available',
    score: 82,
    quality: 'Strong',
    trustLabel: 'Provider whitelisted',
    reasons: ['healthy candidate signals'],
  },
};

const degradedSourceSafety: CandidateBondSourceSafety = {
  canPrepareBond: false,
  detail: 'THORNode source confidence is degraded. Treat candidate status and provider capacity as unverified before preparing any BOND memo.',
  severity: 'warning',
  statusLabel: 'Source degraded',
  title: 'Wait for source confidence',
  value: 'THORNode degraded',
};
const freshSourceSafety = getCandidateBondSourceSafety('healthy');

describe('NodeExplorer', () => {
  it('offers bond memo preparation instead of quick bonding for strong candidates', () => {
    render(
      <NodeExplorer
        nodes={[baseNode]}
        sourceSafety={freshSourceSafety}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByText('Strong · 82/100')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('Ready for bond prep');
    expect(screen.getByRole('link', { name: /Prepare BOND Memo/i })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1provider0000000000000000000000000000000&action=bond&node=thor1nodecandidate0000000000000000000000000000'
    );
    expect(screen.queryByRole('link', { name: /Quick Bond/i })).not.toBeInTheDocument();
  });

  it('routes strong candidates to source confidence while THORNode confidence is degraded', () => {
    render(
      <NodeExplorer
        nodes={[baseNode]}
        sourceConfidenceHref="#explorer-source-confidence"
        sourceSafety={degradedSourceSafety}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByText('Strong · 82/100')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('Wait for source confidence');
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('THORNode source confidence is degraded');
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review source confidence/i })).toHaveAttribute(
      'href',
      '#explorer-source-confidence'
    );
  });

  it('defaults omitted source safety to source review instead of BOND prep', () => {
    render(
      <NodeExplorer
        nodes={[baseNode]}
        sourceConfidenceHref="#explorer-source-confidence"
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByText('Strong · 82/100')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('Wait for source confidence');
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review source confidence/i })).toHaveAttribute(
      'href',
      '#explorer-source-confidence'
    );
  });

  it('separates candidate identity, risk quality, and adjusted APY for scanning', () => {
    render(
      <NodeExplorer
        nodes={[baseNode]}
        sourceSafety={freshSourceSafety}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    const card = screen.getByTestId('candidate-card');
    const recommendation = within(card).getByTestId('candidate-recommendation');
    const scoreEvidence = within(card).getByTestId('candidate-score-evidence');
    const apyPanel = within(card).getByTestId('candidate-apy');

    expect(card).toHaveAccessibleName(`Candidate node ${baseNode.node_address}`);
    expect(within(card).getByText('thor1nodecan...0000')).toBeVisible();
    expect(within(card).getByText('Strong · 82/100')).toBeVisible();
    expect(recommendation).toHaveTextContent('Ready for bond prep');
    expect(scoreEvidence).toHaveAccessibleName(
      'Score evidence from THORNode: 5 of 5 score inputs usable. All score inputs present. Watched address is listed as a bond provider.'
    );
    expect(scoreEvidence).toHaveTextContent('Score evidence · THORNode');
    expect(scoreEvidence).toHaveTextContent('5/5 inputs usable');
    expect(scoreEvidence).toHaveTextContent('All score inputs present');
    expect(scoreEvidence).toHaveTextContent('Capacity: Watched address is listed as a bond provider.');
    expect(recommendation.compareDocumentPosition(apyPanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(recommendation.compareDocumentPosition(scoreEvidence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scoreEvidence.compareDocumentPosition(apyPanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(apyPanel).toHaveAccessibleName('Adjusted APY 10.00 percent');
    expect(apyPanel).toHaveTextContent('Adj. APY');
  });

  it('does not offer bond memo preparation for avoid-rated candidates', () => {
    render(
      <NodeExplorer
        nodes={[{
          ...baseNode,
          slash_points: 180,
          candidateScore: {
            capacityTrust: 'unknown',
            score: 24,
            quality: 'Avoid',
            trustLabel: 'Direct-bond access unknown',
            reasons: ['180 slash points', 'direct-bond access unknown'],
          },
        }]}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByText('Avoid · 24/100')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('Avoid direct bond');
    expect(screen.getAllByTestId('candidate-risk-reason').map((signal) => signal.textContent)).toEqual([
      '180 slash points',
      'direct-bond access unknown',
    ]);
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Quick Bond/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review risk first/i })).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1provider0000000000000000000000000000000&node=thor1nodecandidate0000000000000000000000000000'
    );
    expect(screen.getByRole('link', { name: /Details/i })).toHaveAttribute(
      'href',
      '/dashboard/nodes?address=thor1provider0000000000000000000000000000000&node=thor1nodecandidate0000000000000000000000000000'
    );
  });

  it('routes strong candidates with unknown capacity through risk review before bonding', () => {
    render(
      <NodeExplorer
        nodes={[{
          ...baseNode,
          candidateScore: {
            ...baseNode.candidateScore,
            capacityTrust: 'needs_whitelist',
            trustLabel: 'Needs operator whitelist',
            reasons: ['needs operator whitelist'],
          },
        }]}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByText('Strong · 82/100')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('Confirm provider access first');
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Quick Bond/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review provider access first/i })).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1provider0000000000000000000000000000000&node=thor1nodecandidate0000000000000000000000000000'
    );
  });

  it('highlights the focused candidate from a risk handoff', () => {
    render(
      <NodeExplorer
        focusedNodeAddress={baseNode.node_address}
        nodes={[baseNode]}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    const focusedCard = screen.getByLabelText(`Focused candidate node ${baseNode.node_address}`);

    expect(focusedCard).toHaveAttribute('data-focused-node', 'true');
    expect(focusedCard).toHaveAttribute('id', `explorer-node-${baseNode.node_address}`);
    expect(focusedCard).toHaveTextContent('Focused');
  });

  it('withholds average APY when filters return no candidates', () => {
    render(
      <NodeExplorer
        nodes={[]}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByText('No nodes match your filters. Try adjusting the fee filter.')).toBeVisible();
    expect(screen.getByText('No average APY shown because the current filters returned no candidates.')).toBeVisible();
    expect(screen.queryByText('0.00%')).not.toBeInTheDocument();
  });

  it('marks malformed candidate metrics unavailable instead of rendering NaN near bond actions', () => {
    const { container } = render(
      <NodeExplorer
        nodes={[{
          ...baseNode,
          adjustedAPY: Number.NaN,
          operatorFeePercent: Number.POSITIVE_INFINITY,
          slash_points: Number.NaN,
          totalBond: Number.NEGATIVE_INFINITY,
          candidateScore: {
            capacityTrust: 'available',
            score: 12,
            quality: 'Avoid',
            trustLabel: 'Provider whitelisted',
            reasons: ['slash data unavailable', 'operator fee unavailable', 'bond data unavailable'],
          },
        }]}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByTestId('candidate-apy')).toHaveAccessibleName('Adjusted APY unavailable');
    expect(screen.getByTestId('candidate-score-evidence')).toHaveAccessibleName(
      'Score evidence from THORNode: 1 of 5 score inputs usable. Missing APY, bond, fee, slash. Watched address is listed as a bond provider.'
    );
    expect(screen.getByTestId('candidate-score-evidence')).toHaveTextContent('Missing APY, bond, fee, slash');
    expect(screen.getByRole('link', { name: /Review risk first/i })).toBeInTheDocument();
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText(/average APY unavailable/i)).toBeVisible();
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });
});
