import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useChaosSpecDialog } from './useChaosSpecDialog';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('useChaosSpecDialog', () => {
  const onClose = vi.fn();
  const onModeChange = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
    onModeChange.mockReset();
    useBlueprintStore.setState({
      schema: {
        name: 'Shop',
        version: '1.0.0',
        level: 'container',
        entityRef: 'shop',
        nodes: [
          { entityRef: 'shop/web', name: 'Web', type: 'web-app' },
          { entityRef: 'shop/payment', name: 'Payment', type: 'microservice' },
        ],
        dependencies: [],
      },
      resilienceFaults: [],
      chaosSpecMetadata: null,
      chaosSpecDialogMode: null,
    });
  });

  it('previews a valid ChaosSpec and applies it on load', async () => {
    const { result } = renderHook(() => useChaosSpecDialog(true, 'import', onModeChange, onClose));

    act(() => {
      result.current.setYamlText(`
version: https://archlens.dev/schemas/v1/chaos.schema.json
metadata:
  name: Payment outage
  diagramRef: shop
faults:
  - nodeId: shop/payment
    faultType: region-outage
`);
    });

    expect(result.current.preview?.document?.metadata.name).toBe('Payment outage');
    expect(result.current.canApply).toBe(true);

    await act(async () => {
      await result.current.handleApply(false);
    });

    expect(useBlueprintStore.getState().chaosSpecMetadata?.name).toBe('Payment outage');
    expect(useBlueprintStore.getState().resilienceFaults).toHaveLength(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('generates export YAML from the active scenario', () => {
    useBlueprintStore.setState({
      resilienceFaults: [{ nodeId: 'shop/payment', faultType: 'region-outage', severity: 1 }],
      chaosSpecMetadata: { name: 'Payment outage', diagramRef: 'shop' },
    });

    const { result } = renderHook(() => useChaosSpecDialog(true, 'export', onModeChange, onClose));

    expect(result.current.yamlText).toContain('name: Payment outage');
    expect(result.current.yamlText).toContain('nodeId: shop/payment');
    expect(result.current.canCopyOrDownload).toBe(true);
  });
});
