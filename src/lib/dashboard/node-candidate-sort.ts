export type NodeCandidateSortField = 'quality' | 'apy' | 'bond' | 'slash' | 'version';
export type NodeCandidateSortOrder = 'asc' | 'desc';

export interface SortableNodeCandidate {
  adjustedAPY: number;
  totalBond: number;
  slash_points: number;
  version: string;
  node_address: string;
  candidateScore: {
    score: number;
  };
}

export function getDefaultCandidateSortOrder(field: NodeCandidateSortField): NodeCandidateSortOrder {
  return field === 'slash' ? 'asc' : 'desc';
}

export function getCandidateSortLabel(field: NodeCandidateSortField): string {
  switch (field) {
    case 'quality':
      return 'Quality';
    case 'apy':
      return 'APY';
    case 'bond':
      return 'Bond';
    case 'slash':
      return 'Low Slash';
    case 'version':
      return 'Version';
  }
}

function finiteSortNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function getSortValue(node: SortableNodeCandidate, field: NodeCandidateSortField): number | string {
  switch (field) {
    case 'apy':
      return finiteSortNumber(node.adjustedAPY, Number.NEGATIVE_INFINITY);
    case 'quality':
      return finiteSortNumber(node.candidateScore.score, Number.NEGATIVE_INFINITY);
    case 'bond':
      return finiteSortNumber(node.totalBond, Number.NEGATIVE_INFINITY);
    case 'slash':
      return finiteSortNumber(node.slash_points, Number.POSITIVE_INFINITY);
    case 'version':
      return node.version;
  }
}

function compareValues(aValue: number | string, bValue: number | string, order: NodeCandidateSortOrder): number {
  const multiplier = order === 'asc' ? 1 : -1;

  if (typeof aValue === 'string' && typeof bValue === 'string') {
    return aValue.localeCompare(bValue) * multiplier;
  }

  if (aValue === bValue) return 0;
  return (aValue > bValue ? 1 : -1) * multiplier;
}

export function sortNodeCandidates<TNode extends SortableNodeCandidate>(
  nodes: TNode[],
  field: NodeCandidateSortField,
  order: NodeCandidateSortOrder
): TNode[] {
  return [...nodes].sort((a, b) => {
    const primary = compareValues(getSortValue(a, field), getSortValue(b, field), order);
    if (primary !== 0) return primary;

    const qualityTieBreak = compareValues(a.candidateScore.score, b.candidateScore.score, 'desc');
    if (qualityTieBreak !== 0) return qualityTieBreak;

    return a.node_address.localeCompare(b.node_address);
  });
}
