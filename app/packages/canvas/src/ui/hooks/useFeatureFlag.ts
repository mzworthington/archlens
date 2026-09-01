import { useSearch } from 'wouter';
import {
  isFeatureEnabled,
  latchFeaturesFromSearch,
} from '../../application/navigation/featureGate';

/** Latch every `feature-*` query param for this origin. Mount once in the app shell. */
export function useFeatureFlagLatch(): void {
  const search = useSearch();
  latchFeaturesFromSearch(search);
}

/** Read (and latch) one `?feature-<id>=` flag. */
export function useFeatureFlag(flagId: string): boolean {
  const search = useSearch();
  return isFeatureEnabled(flagId, search);
}
