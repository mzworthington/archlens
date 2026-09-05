import { useCallback, useSyncExternalStore } from 'react';
import { isFeatureEnabled, subscribeFeatureFlags } from '../../application/navigation/featureGate';

export function useFeatureFlag(flagId: string): boolean {
  const getSnapshot = useCallback(() => isFeatureEnabled(flagId), [flagId]);
  return useSyncExternalStore(subscribeFeatureFlags, getSnapshot, () => false);
}
