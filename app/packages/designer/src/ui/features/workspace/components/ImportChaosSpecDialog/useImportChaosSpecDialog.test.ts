import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useImportChaosSpecDialog } from './useImportChaosSpecDialog';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('useImportChaosSpecDialog', () => {
  beforeEach(() => {
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
      loadedChaosSpec: null,
    });
  });

  it('previews a valid ChaosSpec and applies it on load', async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useImportChaosSpecDialog(true, onClose));

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

    expect(useBlueprintStore.getState().loadedChaosSpec?.metadata.name).toBe('Payment outage');
    expect(onClose).toHaveBeenCalled();
  });
});
