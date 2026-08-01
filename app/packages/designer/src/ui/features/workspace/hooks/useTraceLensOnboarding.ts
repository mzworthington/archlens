import { useEffect } from 'react';
import { useBlueprintStore } from '../../../../application/store/store';
import { loadedSystemsHaveForensics } from '../../../../application/forensics/rankOffenders';

const STORAGE_KEY = 'archlens.traceLensOnboardingDismissed';

/**
 * After forensics data first appears, nudge users to enable TraceLens canvas overlays.
 */
export function useTraceLensOnboarding(): void {
  const loadedSystems = useBlueprintStore(s => s.loadedSystems);
  const showCoupling = useBlueprintStore(s => s.showCoupling);
  const showHotspotHeatmap = useBlueprintStore(s => s.showHotspotHeatmap);
  const setShowCoupling = useBlueprintStore(s => s.setShowCoupling);
  const setNotification = useBlueprintStore(s => s.setNotification);

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) return;
    if (!loadedSystemsHaveForensics(loadedSystems)) return;
    if (showCoupling && showHotspotHeatmap) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, '1');
      }
      return;
    }

    setNotification({
      type: 'info',
      title: 'TraceLens data loaded',
      message:
        'Turn on coupling lens and risk heatmap to see refactor signals on the canvas. Open the TraceLens side panel to adjust these anytime.',
      actions: [
        {
          label: 'Enable overlays',
          onClick: () => {
            useBlueprintStore.getState().setTraceLensPanelOpen(true);
            useBlueprintStore.getState().setShowCoupling(true);
            if (!useBlueprintStore.getState().showHotspotHeatmap) {
              useBlueprintStore.getState().toggleShowHotspotHeatmap();
            }
            useBlueprintStore.getState().setNotification(null);
          },
        },
      ],
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
  }, [loadedSystems, showCoupling, showHotspotHeatmap, setShowCoupling, setNotification]);
}
