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
    trustLabel: 'Provider listed by THORNode',
    reasons: ['No obvious candidate blockers in current inputs'],
  },
};

const degradedSourceSafety: CandidateBondSourceSafety = {
  canPrepareBond: false,
  detail: 'THORNode candidate source check is degraded. Treat candidate status and provider capacity as unverified before reviewing or copying any BOND memo.',
  severity: 'warning',
  statusLabel: 'Source degraded',
  title: 'Wait for source check',
  value: 'THORNode degraded',
};
const freshSourceSafety = getCandidateBondSourceSafety('healthy');

describe('NodeExplorer', () => {
  it('offers bond memo review instead of quick bonding or ready-state prep for strong candidates', () => {
    render(
      <NodeExplorer
        nodes={[baseNode]}
        sourceSafety={freshSourceSafety}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByText('Strong candidate')).toBeInTheDocument();
    const recommendation = screen.getByTestId('candidate-recommendation');
    const qualityBadge = screen.getByText('Strong candidate');
    expect(qualityBadge).toHaveClass('bg-sky-100');
    expect(qualityBadge).not.toHaveClass('bg-emerald-100');
    expect(recommendation).toHaveTextContent('Review before BOND memo');
    expect(recommendation).toHaveTextContent('Candidate evidence and THORNode-listed provider access support reviewing a BOND memo');
    expect(recommendation).not.toHaveTextContent('Candidate evidence and capacity support reviewing a BOND memo');
    expect(recommendation).not.toHaveTextContent('Score and capacity support preparing a BOND memo');
    expect(recommendation).not.toHaveTextContent('memo prep');
    expect(recommendation).toHaveTextContent('not a safety guarantee');
    expect(recommendation).not.toHaveTextContent('Ready for bond prep');
    expect(recommendation).toHaveClass('border-sky-400');
    expect(recommendation).not.toHaveClass('border-emerald-400');
    expect(screen.getByRole('link', { name: /Review BOND Memo/i })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1provider0000000000000000000000000000000&action=bond&node=thor1nodecandidate0000000000000000000000000000'
    );
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Quick Bond/i })).not.toBeInTheDocument();
  });

  it('routes strong candidates to source checks while THORNode checks are degraded', () => {
    render(
      <NodeExplorer
        nodes={[baseNode]}
        sourceConfidenceHref="#explorer-source-confidence"
        sourceSafety={degradedSourceSafety}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByText('Strong candidate')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('Wait for source check');
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('THORNode candidate source check is degraded');
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review source checks/i })).toHaveAttribute(
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

    expect(screen.getByText('Strong candidate')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('Wait for source check');
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review source checks/i })).toHaveAttribute(
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
    expect(within(card).getByText('Strong candidate')).toBeVisible();
    expect(card).not.toHaveTextContent(/\d+\/100/);
    expect(recommendation).toHaveTextContent('Review before BOND memo');
    expect(recommendation).toHaveTextContent('not a safety guarantee');
    expect(recommendation).not.toHaveTextContent('Ready for bond prep');
    expect(recommendation).not.toHaveTextContent('memo prep');
    expect(scoreEvidence).toHaveAccessibleName(
      'Candidate evidence from THORNode: 5 of 5 candidate inputs usable. All candidate inputs present. Watched address is listed as a bond provider.'
    );
    expect(scoreEvidence).toHaveTextContent('Candidate evidence · THORNode');
    expect(scoreEvidence).toHaveTextContent('5/5 inputs usable');
    expect(scoreEvidence).toHaveTextContent('All candidate inputs present');
    expect(scoreEvidence).toHaveTextContent('Capacity: Watched address is listed as a bond provider.');
    expect(within(scoreEvidence).getByText(/All candidate inputs present/)).toHaveClass('text-sky-700');
    expect(within(scoreEvidence).getByText(/All candidate inputs present/)).not.toHaveClass('text-emerald-700');
    expect(recommendation.compareDocumentPosition(apyPanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(recommendation.compareDocumentPosition(scoreEvidence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scoreEvidence.compareDocumentPosition(apyPanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(apyPanel).toHaveAccessibleName('Adjusted APY 10.00 percent');
    expect(apyPanel).toHaveTextContent('Adj. APY');
  });

  it('frames high APY and zero slash as source metrics instead of green approvals', () => {
    render(
      <NodeExplorer
        nodes={[{
          ...baseNode,
          adjustedAPY: 88,
          slash_points: 0,
        }]}
        sourceSafety={freshSourceSafety}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    const apy = within(screen.getByTestId('candidate-apy')).getByText('88.00%');
    const slash = within(screen.getByTestId('candidate-slash')).getByText('0');

    expect(apy).toHaveClass('text-sky-600');
    expect(apy).not.toHaveClass('text-emerald-600');
    expect(slash).toHaveClass('text-sky-600');
    expect(slash).not.toHaveClass('text-emerald-600');
    expect(screen.getByTestId('candidate-slash')).toHaveAccessibleName('Slash points 0 from current THORNode source data');
  });

  it('frames bonded membership and active status as source facts instead of green approvals', () => {
    render(
      <NodeExplorer
        nodes={[baseNode]}
        sourceSafety={freshSourceSafety}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[{ nodeAddress: baseNode.node_address }]}
      />
    );

    const bondedBadge = screen.getByTestId('candidate-bonded-badge');
    const status = screen.getByTestId('candidate-status');
    const statusIcon = within(status).getByTestId('candidate-status-icon');

    expect(bondedBadge).toHaveTextContent('Bonded');
    expect(bondedBadge).toHaveAccessibleName('Watched address is listed as bonded to this node in current THORNode source data');
    expect(bondedBadge).toHaveClass('bg-sky-100');
    expect(bondedBadge).not.toHaveClass('bg-emerald-100');
    expect(status).toHaveAccessibleName('Node status Active from current THORNode source data');
    expect(statusIcon).toHaveClass('text-sky-500');
    expect(statusIcon).not.toHaveClass('text-emerald-500');
    expect(within(status).getByTestId('candidate-status-value')).toHaveTextContent('Active');
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

    expect(screen.getByText('Avoid candidate')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('Avoid direct bond');
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('Review risk context before reviewing any BOND memo');
    expect(screen.getByTestId('candidate-recommendation')).not.toHaveTextContent('opening BOND memo review');
    expect(screen.getByTestId('candidate-recommendation')).not.toHaveTextContent('before preparing any BOND memo');
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
            trustLabel: 'Provider not listed by THORNode',
            reasons: ['provider not listed by THORNode'],
          },
        }]}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByText('Strong candidate')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('Confirm provider access first');
    expect(screen.getByTestId('candidate-recommendation')).toHaveTextContent('Ask the operator to add or confirm provider access before reviewing any BOND memo');
    expect(screen.getByTestId('candidate-recommendation')).not.toHaveTextContent('opening BOND memo review');
    expect(screen.getByTestId('candidate-recommendation')).not.toHaveTextContent(/whitelist/i);
    expect(screen.getByTestId('candidate-recommendation')).not.toHaveTextContent('before preparing a BOND memo');
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
            trustLabel: 'Provider listed by THORNode',
            reasons: ['slash data unavailable', 'operator fee unavailable', 'bond data unavailable'],
          },
        }]}
        userAddress="thor1provider0000000000000000000000000000000"
        positions={[]}
      />
    );

    expect(screen.getByTestId('candidate-apy')).toHaveAccessibleName('Adjusted APY unavailable');
    expect(screen.getByTestId('candidate-score-evidence')).toHaveAccessibleName(
      'Candidate evidence from THORNode: 1 of 5 candidate inputs usable. Missing APY, bond, fee, slash. Watched address is listed as a bond provider.'
    );
    expect(screen.getByTestId('candidate-score-evidence')).toHaveTextContent('Missing APY, bond, fee, slash');
    expect(screen.getByRole('link', { name: /Review risk first/i })).toBeInTheDocument();
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText(/average APY unavailable/i)).toBeVisible();
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
    expect(container).not.toHaveTextContent(/\d+\/100/);
  });
});
