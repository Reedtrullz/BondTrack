import { describe, expect, it } from 'vitest';
import {
  getCandidateSortLabel,
  getDefaultCandidateSortOrder,
  sortNodeCandidates,
  type SortableNodeCandidate,
} from './node-candidate-sort';

function candidate(overrides: Partial<SortableNodeCandidate>): SortableNodeCandidate {
  return {
    node_address: 'thor1candidate0000000000000000000000000000000',
    adjustedAPY: 10,
    totalBond: 10_000,
    slash_points: 0,
    version: '3.19.0',
    candidateScore: { score: 50 },
    ...overrides,
  };
}

describe('node candidate sorting', () => {
  it('defaults slash sorting to low-risk first', () => {
    expect(getDefaultCandidateSortOrder('slash')).toBe('asc');
    expect(getCandidateSortLabel('slash')).toBe('Low Slash');
  });

  it('sorts slash points ascending before quality tie-breaks', () => {
    const sorted = sortNodeCandidates([
      candidate({ node_address: 'thor1highslash', slash_points: 200, candidateScore: { score: 90 } }),
      candidate({ node_address: 'thor1clean', slash_points: 0, candidateScore: { score: 40 } }),
      candidate({ node_address: 'thor1minor', slash_points: 8, candidateScore: { score: 50 } }),
    ], 'slash', getDefaultCandidateSortOrder('slash'));

    expect(sorted.map((node) => node.node_address)).toEqual([
      'thor1clean',
      'thor1minor',
      'thor1highslash',
    ]);
  });

  it('sorts quality descending by default', () => {
    const sorted = sortNodeCandidates([
      candidate({ node_address: 'thor1watch', candidateScore: { score: 62 } }),
      candidate({ node_address: 'thor1strong', candidateScore: { score: 91 } }),
    ], 'quality', getDefaultCandidateSortOrder('quality'));

    expect(sorted.map((node) => node.node_address)).toEqual(['thor1strong', 'thor1watch']);
  });

  it('keeps malformed numeric sort values from ranking as best candidates', () => {
    const slashSorted = sortNodeCandidates([
      candidate({ node_address: 'thor1unknownslash', slash_points: Number.NaN, candidateScore: { score: 90 } }),
      candidate({ node_address: 'thor1clean', slash_points: 0, candidateScore: { score: 40 } }),
    ], 'slash', 'asc');
    const apySorted = sortNodeCandidates([
      candidate({ node_address: 'thor1unknownapy', adjustedAPY: Number.NaN, candidateScore: { score: 90 } }),
      candidate({ node_address: 'thor1knownapy', adjustedAPY: 12, candidateScore: { score: 40 } }),
    ], 'apy', 'desc');

    expect(slashSorted.map((node) => node.node_address)).toEqual(['thor1clean', 'thor1unknownslash']);
    expect(apySorted.map((node) => node.node_address)).toEqual(['thor1knownapy', 'thor1unknownapy']);
  });
});
