import { useEffect, useMemo, useRef, useState } from 'react';
import type { EntityRef } from '@archlens/core';
import type { SimulationResult } from '@archlens/core/resilience';
import {
  BLAST_WAVE_MS,
  buildBlastRippleFrame,
  type BlastRippleFrame,
} from '../../../application/resilience/blastRipple';

const EMPTY_FRAME: BlastRippleFrame = {
  animatedHeat: new Map(),
  ripplingNodes: new Set(),
  propagationEdgeKeys: new Set(),
  isAnimating: false,
};

export type BlastRippleAnimationOptions = {
  enabled: boolean;
  preferReducedMotion: boolean;
  liteCanvas: boolean;
  edges: ReadonlyArray<{ id: string; source: string; target: string }>;
  nodeIdForEntityRef: (entityRef: EntityRef) => string | undefined;
};

export function useBlastRippleAnimation(
  result: SimulationResult | null,
  options: BlastRippleAnimationOptions
): BlastRippleFrame {
  const [elapsedMs, setElapsedMs] = useState(0);
  const runIdRef = useRef(0);

  const staticFrame = useMemo((): BlastRippleFrame => {
    if (!result) return EMPTY_FRAME;
    return {
      animatedHeat: result.heat,
      ripplingNodes: new Set(),
      propagationEdgeKeys: new Set(),
      isAnimating: false,
    };
  }, [result]);

  useEffect(() => {
    if (!result) {
      setElapsedMs(0);
      return;
    }
    runIdRef.current += 1;
    setElapsedMs(0);
  }, [result]);

  useEffect(() => {
    if (!result || !options.enabled || options.preferReducedMotion || options.liteCanvas) {
      return;
    }

    const runId = runIdRef.current;
    let maxHop = 0;
    for (const hop of result.heatHops.values()) {
      if (hop > maxHop) maxHop = hop;
    }
    const totalDuration = (maxHop + 1) * BLAST_WAVE_MS + 50;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      if (runIdRef.current !== runId) return;
      const elapsed = now - start;
      setElapsedMs(elapsed);
      if (elapsed < totalDuration) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result, options.enabled, options.preferReducedMotion, options.liteCanvas]);

  return useMemo(() => {
    if (!result) return EMPTY_FRAME;
    if (!options.enabled || options.preferReducedMotion || options.liteCanvas) {
      return staticFrame;
    }

    return buildBlastRippleFrame(
      result.heat,
      result.heatHops,
      elapsedMs,
      options.edges,
      options.nodeIdForEntityRef
    );
  }, [
    result,
    elapsedMs,
    options.enabled,
    options.preferReducedMotion,
    options.liteCanvas,
    options.edges,
    options.nodeIdForEntityRef,
    staticFrame,
  ]);
}
