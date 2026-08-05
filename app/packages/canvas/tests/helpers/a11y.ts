import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { A11Y_BASELINE_DISABLED_RULES } from '../a11y-baseline';

const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

type AxeViolation = {
  id: string;
  impact?: string | null;
  help: string;
  nodes: Array<{ target: string[] }>;
};

function formatViolation(violation: AxeViolation): string {
  const nodes = violation.nodes
    .slice(0, 3)
    .map(node => node.target.join(' '))
    .join('; ');
  const suffix = violation.nodes.length > 3 ? ` (+${violation.nodes.length - 3} more)` : '';
  return `${violation.id} (${violation.impact}): ${violation.help} — ${nodes}${suffix}`;
}

/**
 * Fail when axe reports serious/critical WCAG violations on the current page state.
 */
export async function expectNoSeriousA11yViolations(page: Page, context?: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules([...A11Y_BASELINE_DISABLED_RULES])
    .analyze();
  const blocking = results.violations.filter(
    violation => violation.impact && BLOCKING_IMPACTS.has(violation.impact)
  );

  if (blocking.length > 0) {
    const label = context ? `${context}\n` : '';
    expect(
      blocking,
      `${label}Serious accessibility violations:\n${blocking.map(formatViolation).join('\n')}`
    ).toEqual([]);
  }
}
