/** How often a visible tab re-checks for a deployed build. */
export const UPDATE_CHECK_INTERVAL_MS = 60_000;

export type PeriodicUpdateCheck = {
  check: () => void;
  isVisible: () => boolean;
  subscribeVisibility: (onChange: () => void) => () => void;
  intervalMs?: number;
};

/**
 * Run `check` when the tab is visible: immediately, on each interval tick,
 * and when visibility returns. Hidden tabs skip ticks.
 */
export function startPeriodicUpdateChecks({
  check,
  isVisible,
  subscribeVisibility,
  intervalMs = UPDATE_CHECK_INTERVAL_MS,
}: PeriodicUpdateCheck): () => void {
  const runIfVisible = () => {
    if (isVisible()) check();
  };

  runIfVisible();
  const timer = setInterval(runIfVisible, intervalMs);
  const unsubscribe = subscribeVisibility(runIfVisible);

  return () => {
    clearInterval(timer);
    unsubscribe();
  };
}
