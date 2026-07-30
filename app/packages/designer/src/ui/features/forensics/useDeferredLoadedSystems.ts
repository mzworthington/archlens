import { useEffect, useState } from 'react';
import type { LoadedSystemRef } from '../../../application/forensics/rankOffenders';

/**
 * Debounce loaded-system updates while background prefetch is still running so
 * TraceLens ranking does not rerun on every incremental diagram load.
 */
export function useDeferredLoadedSystems<T extends LoadedSystemRef>(
  loadedSystems: readonly T[],
  defer: boolean,
  delayMs = 150
): readonly T[] {
  const [deferred, setDeferred] = useState(loadedSystems);

  useEffect(() => {
    if (!defer) {
      setDeferred(loadedSystems);
      return;
    }

    const timer = window.setTimeout(() => setDeferred(loadedSystems), delayMs);
    return () => window.clearTimeout(timer);
  }, [loadedSystems, defer, delayMs]);

  return defer ? deferred : loadedSystems;
}
