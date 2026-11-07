import { beforeEach, describe, expect, it } from 'vitest';
import type { DiagramView } from '../features/editorPreview/ports';
import {
  closeDiagramSession,
  focusDiagramSystem,
  openDiagramSession,
  readFocusedSystem,
  replaceDiagramSession,
  resetDiagramSession,
} from './diagramSession';

function diagram(name: string, entityRef: string, sourceFile: string): DiagramView {
  return {
    sourcePath: `/repo/blueprints/${name}.yaml`,
    level: 'context',
    systems: [{ name, entityRef, sourceFile }],
    links: [],
  };
}

describe('diagram session', () => {
  beforeEach(() => {
    resetDiagramSession();
  });

  it('keeps an older map focused when a newer map opens and closes', () => {
    const checkout = openDiagramSession(
      diagram('Checkout API', 'checkout/api', 'src/checkout.ts'),
      '/repo'
    );
    focusDiagramSystem(checkout, 'checkout/api');
    const billing = openDiagramSession(
      diagram('Billing', 'billing/api', 'src/billing.ts'),
      '/repo'
    );

    expect(readFocusedSystem()).toEqual({
      name: 'Checkout API',
      sourceFile: 'src/checkout.ts',
      workspaceRoot: '/repo',
    });

    closeDiagramSession(billing);

    expect(readFocusedSystem()).toEqual({
      name: 'Checkout API',
      sourceFile: 'src/checkout.ts',
      workspaceRoot: '/repo',
    });
  });

  it('follows the map that received a shared entity ref', () => {
    const checkout = openDiagramSession(
      diagram('Checkout API', 'shared', 'src/checkout.ts'),
      '/repo'
    );
    const billing = openDiagramSession(diagram('Billing API', 'shared', 'src/billing.ts'), '/repo');
    focusDiagramSystem(checkout, 'shared');
    focusDiagramSystem(billing, 'shared');

    expect(readFocusedSystem()).toEqual({
      name: 'Billing API',
      sourceFile: 'src/billing.ts',
      workspaceRoot: '/repo',
    });

    closeDiagramSession(billing);

    expect(readFocusedSystem()).toEqual({
      name: 'Checkout API',
      sourceFile: 'src/checkout.ts',
      workspaceRoot: '/repo',
    });
  });

  it('ignores focus sent to a closed map', () => {
    const checkout = openDiagramSession(
      diagram('Checkout API', 'checkout/api', 'src/checkout.ts'),
      '/repo'
    );
    focusDiagramSystem(checkout, 'checkout/api');
    closeDiagramSession(checkout);
    focusDiagramSystem(checkout, 'checkout/api');

    expect(readFocusedSystem()).toBeUndefined();
  });

  it('clears focus for a map whose blueprint was replaced', () => {
    const checkout = openDiagramSession(
      diagram('Checkout API', 'shared', 'src/checkout.ts'),
      '/repo'
    );
    const billing = openDiagramSession(diagram('Billing API', 'shared', 'src/billing.ts'), '/repo');
    focusDiagramSystem(checkout, 'shared');
    focusDiagramSystem(billing, 'shared');

    replaceDiagramSession(billing, diagram('Billing API', 'shared', 'src/next.ts'), '/repo');

    expect(readFocusedSystem()).toBeUndefined();

    focusDiagramSystem(checkout, 'shared');

    expect(readFocusedSystem()).toEqual({
      name: 'Checkout API',
      sourceFile: 'src/checkout.ts',
      workspaceRoot: '/repo',
    });
  });
});
