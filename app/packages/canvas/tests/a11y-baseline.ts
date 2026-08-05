/**
 * Axe rules temporarily disabled while the dark-theme contrast audit lands.
 * Shrink this list over time — do not add new suppressions without a ticket.
 */
export const A11Y_BASELINE_DISABLED_RULES = [
  'color-contrast',
  'scrollable-region-focusable',
] as const;
