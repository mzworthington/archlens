/** React Flow edge type for a dependency whose source and target are the same node. */
export const SELF_LOOP_EDGE_TYPE = 'selfLoop';

const SELF_LOOP_REACH = 88;

type SelfLoopEdgePath = {
  path: string;
  labelX: number;
  labelY: number;
};

/**
 * Cubic loop that bows past the rightmost handle.
 * The default bezier between opposite sides of one node stays on the card's
 * midline, and React Flow paints that stroke behind the node.
 */
export function selfLoopEdgePath(input: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}): SelfLoopEdgePath {
  const bowX = Math.max(input.sourceX, input.targetX) + SELF_LOOP_REACH;
  const sourceControlX = bowX;
  const sourceControlY = input.sourceY - SELF_LOOP_REACH;
  const targetControlX = bowX;
  const targetControlY = input.targetY + SELF_LOOP_REACH;
  const path = `M ${input.sourceX},${input.sourceY} C ${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${input.targetX},${input.targetY}`;
  const labelX =
    input.sourceX * 0.125 + sourceControlX * 0.375 + targetControlX * 0.375 + input.targetX * 0.125;
  const labelY =
    input.sourceY * 0.125 + sourceControlY * 0.375 + targetControlY * 0.375 + input.targetY * 0.125;
  return { path, labelX, labelY };
}
