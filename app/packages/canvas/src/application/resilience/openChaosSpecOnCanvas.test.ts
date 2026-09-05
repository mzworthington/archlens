import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceCatalogEntry } from '@archlens/core';
import { openChaosSpecOnCanvas } from './openChaosSpecOnCanvas';

const yaml = `
version: https://archlens.dev/schemas/v1/chaos.schema.json
metadata:
  name: Payment outage
  diagramRef: shop
faults:
  - nodeId: shop/payment
    faultType: region-outage
`;

const shop: WorkspaceCatalogEntry = {
  path: 'shop.yaml',
  name: 'Shop',
  level: 'container',
  entityRef: 'shop',
  nodeEntityRefs: ['shop/payment'],
};

describe('openChaosSpecOnCanvas', () => {
  it('navigates to the target diagram, selects it and applies the ChaosSpec', async () => {
    const setLocation = vi.fn();
    const selectSystem = vi.fn(async () => undefined);
    const applyChaosSpecYaml = vi.fn(() => null);
    const runResilienceSimulation = vi.fn();

    const result = await openChaosSpecOnCanvas(yaml, {
      workspaceCatalog: [shop],
      setLocation,
      selectSystem,
      applyChaosSpecYaml,
      runResilienceSimulation,
    });

    expect(result.ok).toBe(true);
    expect(setLocation).toHaveBeenCalledWith(
      expect.stringContaining('/workspace/shop?lens=chaoslens')
    );
    expect(selectSystem).toHaveBeenCalledWith('shop.yaml');
    expect(applyChaosSpecYaml).toHaveBeenCalledWith(yaml);
    expect(runResilienceSimulation).not.toHaveBeenCalled();
  });

  it('runs simulation when requested', async () => {
    const runResilienceSimulation = vi.fn();
    const result = await openChaosSpecOnCanvas(
      yaml,
      {
        workspaceCatalog: [shop],
        setLocation: vi.fn(),
        selectSystem: vi.fn(async () => undefined),
        applyChaosSpecYaml: vi.fn(() => null),
        runResilienceSimulation,
      },
      { simulate: true }
    );
    expect(result.ok).toBe(true);
    expect(runResilienceSimulation).toHaveBeenCalledOnce();
  });

  it('fails when the diagram is missing from the workspace catalog', async () => {
    const applyChaosSpecYaml = vi.fn(() => null);
    const result = await openChaosSpecOnCanvas(yaml, {
      workspaceCatalog: [],
      setLocation: vi.fn(),
      selectSystem: vi.fn(async () => undefined),
      applyChaosSpecYaml,
    });
    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining('shop'),
    });
    expect(applyChaosSpecYaml).not.toHaveBeenCalled();
  });

  it('surfaces apply errors after navigation', async () => {
    const result = await openChaosSpecOnCanvas(yaml, {
      workspaceCatalog: [shop],
      setLocation: vi.fn(),
      selectSystem: vi.fn(async () => undefined),
      applyChaosSpecYaml: vi.fn(() => 'Fault target missing'),
    });
    expect(result).toEqual({ ok: false, reason: 'Fault target missing' });
  });
});
