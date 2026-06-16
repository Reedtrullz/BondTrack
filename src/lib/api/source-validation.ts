export function hasUsableThornodeNode(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;

  const node = value as Record<string, unknown>;
  const providers = (node.bond_providers as Record<string, unknown> | undefined)?.providers;

  return (
    typeof node.node_address === 'string' &&
    node.node_address.length > 0 &&
    typeof node.status === 'string' &&
    node.status.length > 0 &&
    typeof node.total_bond === 'string' &&
    /^\d+$/.test(node.total_bond) &&
    typeof node.slash_points === 'number' &&
    Number.isFinite(node.slash_points) &&
    Array.isArray(providers)
  );
}

export function assertUsableThornodeNodes(nodes: unknown): asserts nodes is unknown[] {
  if (!Array.isArray(nodes) || !nodes.some(hasUsableThornodeNode)) {
    throw new Error('THORNode readiness probe returned no usable node records');
  }
}
