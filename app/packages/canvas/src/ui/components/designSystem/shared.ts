export const PRODUCT_CATEGORY_TOKENS = {
  Platform: '--color-category-platform',
  Intelligence: '--color-category-intelligence',
  Resilience: '--color-category-resilience',
  Contract: '--color-category-contract',
} as const;

export const PRODUCT_CATEGORY_STYLES = {
  Platform: 'text-category-platform border-category-platform/20 bg-category-platform/10',
  Intelligence:
    'text-category-intelligence border-category-intelligence/20 bg-category-intelligence/10',
  Resilience: 'text-category-resilience border-category-resilience/20 bg-category-resilience/10',
  Contract: 'text-category-contract border-category-contract/20 bg-category-contract/10',
} as const;

export const NODE_STATUS_TOKENS = {
  healthy: '--color-status-healthy',
  warning: '--color-status-warning',
  error: '--color-status-error',
} as const;

export const NODE_STATUS_STYLES = {
  healthy: 'bg-status-healthy/15 border-status-healthy text-status-healthy',
  warning: 'bg-status-warning/15 border-status-warning text-status-warning',
  error: 'bg-status-error/15 border-status-error text-status-error',
} as const;

export const NODE_STATUS_MARKERS = {
  healthy: 'bg-status-healthy shadow-[0_0_8px_var(--color-status-healthy)]',
  warning: 'bg-status-warning shadow-[0_0_8px_var(--color-status-warning)]',
  error: 'bg-status-error shadow-[0_0_8px_var(--color-status-error)]',
} as const;
