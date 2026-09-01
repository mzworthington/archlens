import { useCallback, useSyncExternalStore } from 'react';
import { isFeatureEnabled, subscribeFeatureFlags } from '../../application/navigation/featureGate';

/** Read one persisted flag. Re-renders when any flag is toggled in this tab. */
export function useFeatureFlag(flagId: string): boolean {
  const getSnapshot = useCallback(() => isFeatureEnabled(flagId), [flagId]);
  return useSyncExternalStore(subscribeFeatureFlags, getSnapshot, () => false);
}
