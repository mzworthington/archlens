import type { CoupledFileForensics, NodeForensics } from '../models/schema';

/**
 * Roll up top coupled peers from child node forensics (containers / systems).
 */
export function rollupTopCoupledFiles(
  nodes: readonly { forensics?: NodeForensics }[],
  limit = 5
): CoupledFileForensics[] {
  const byPath = new Map<string, CoupledFileForensics>();

  for (const node of nodes) {
    for (const edge of node.forensics?.coupledFiles ?? []) {
      const existing = byPath.get(edge.path);
      if (!existing || edge.score > existing.score) {
        byPath.set(edge.path, { ...edge });
      }
    }
  }

  return [...byPath.values()]
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, limit);
}
