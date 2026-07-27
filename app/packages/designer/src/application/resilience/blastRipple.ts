import type { EntityRef } from '@blueprint/core';

/** Duration of each upstream propagation wave in milliseconds. */
export const BLAST_WAVE_MS = 450;

export type BlastRippleFrame = {
  animatedHeat: Map<EntityRef, number>;
  ripplingNodes: Set<EntityRef>;
  propagationEdgeKeys: Set<string>;
  isAnimating: boolean;
};

export function blastPropagationEdgeKey(source: string, target: string): string {
  return `${source}->${target}`;
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** Progress (0–1) for a node at the given hop when elapsed ms have passed. */
export function blastWaveProgress(elapsedMs: number, hop: number, waveMs = BLAST_WAVE_MS): number {
  const waveStart = hop * waveMs;
  const t = (elapsedMs - waveStart) / waveMs;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return easeOutQuad(t);
}

export function computeBlastRippleFrame(
  heat: Map<EntityRef, number>,
  heatHops: Map<EntityRef, number>,
  elapsedMs: number,
  options?: { waveMs?: number }
): BlastRippleFrame {
  const waveMs = options?.waveMs ?? BLAST_WAVE_MS;
  const animatedHeat = new Map<EntityRef, number>();
  const ripplingNodes = new Set<EntityRef>();

  let maxHop = 0;
  for (const hop of heatHops.values()) {
    if (hop > maxHop) maxHop = hop;
  }

  for (const [nodeId, intensity] of heat) {
    if (intensity <= 0) continue;
    const hop = heatHops.get(nodeId) ?? 0;
    const progress = blastWaveProgress(elapsedMs, hop, waveMs);
    if (progress <= 0) continue;

    animatedHeat.set(nodeId, intensity * progress);

    if (progress > 0 && progress < 1) {
      ripplingNodes.add(nodeId);
    }
  }

  const totalDuration = (maxHop + 1) * waveMs;
  const isAnimating = elapsedMs < totalDuration;

  return {
    animatedHeat,
    ripplingNodes,
    propagationEdgeKeys: new Set(),
    isAnimating,
  };
}

/**
 * Edges on the upstream propagation path ripple when the caller wave is active.
 * Dependency edge source → target: impact flows from target (lower hop) to source (higher hop).
 */
export function computePropagationEdgeKeys(
  heatHops: Map<EntityRef, number>,
  edges: ReadonlyArray<{ id: string; source: string; target: string }>,
  elapsedMs: number,
  nodeIdForEntityRef: (entityRef: EntityRef) => string | undefined,
  options?: { waveMs?: number }
): Set<string> {
  const waveMs = options?.waveMs ?? BLAST_WAVE_MS;
  const keys = new Set<string>();

  for (const edge of edges) {
    const sourceHop =
      heatHops.get(edge.source) ?? heatHops.get(nodeIdForEntityRef(edge.source) ?? '');
    const targetHop =
      heatHops.get(edge.target) ?? heatHops.get(nodeIdForEntityRef(edge.target) ?? '');
    if (sourceHop == null || targetHop == null) continue;
    if (sourceHop !== targetHop + 1) continue;

    const progress = blastWaveProgress(elapsedMs, sourceHop, waveMs);
    if (progress > 0 && progress < 1) {
      keys.add(blastPropagationEdgeKey(edge.source, edge.target));
      keys.add(edge.id);
    }
  }

  return keys;
}

export function buildBlastRippleFrame(
  heat: Map<EntityRef, number>,
  heatHops: Map<EntityRef, number>,
  elapsedMs: number,
  edges: ReadonlyArray<{ id: string; source: string; target: string }>,
  nodeIdForEntityRef: (entityRef: EntityRef) => string | undefined,
  options?: { waveMs?: number }
): BlastRippleFrame {
  const frame = computeBlastRippleFrame(heat, heatHops, elapsedMs, options);
  frame.propagationEdgeKeys = computePropagationEdgeKeys(
    heatHops,
    edges,
    elapsedMs,
    nodeIdForEntityRef,
    options
  );
  return frame;
}
