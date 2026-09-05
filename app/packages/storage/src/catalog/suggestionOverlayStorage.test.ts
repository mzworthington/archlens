import { describe, expect, it } from 'vitest';
import { applySuggestionOverlays, type SuggestionOverlay } from '@archlens/core';
import { InMemoryObjectStorage } from '../testing/inMemoryObjectStorage';
import {
  loadSuggestionOverlaysFromStorage,
  rejectSuggestionOverlayInStorage,
  uploadSuggestionOverlay,
} from './suggestionOverlayStorage';

const BASE_CONTEXT = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: estate
  name: Estate
nodes:
  - entityRef: estate/payments
    type: software-system
    name: Payments
dependencies: []
`;

const overlay: SuggestionOverlay = {
  version: 1,
  overlayId: 'add-billing',
  estateId: 'acme',
  status: 'accepted',
  kind: 'add-dependent',
  targetPath: 'context.yaml',
  sourceRef: 'canvas@user',
  acceptedAt: '2026-08-04T12:00:00.000Z',
  delta: {
    nodes: [
      {
        entityRef: 'estate/billing-api',
        type: 'software-system',
        name: 'Billing API',
        external: true,
      },
    ],
    dependencies: [{ from: 'estate/payments', to: 'estate/billing-api', type: 'direct-call' }],
  },
};

describe('Feature: suggestion overlay staging in object storage', () => {
  it('uploads, loads and tombstones overlays', async () => {
    const storage = new InMemoryObjectStorage();
    await uploadSuggestionOverlay(overlay, storage);

    const loaded = await loadSuggestionOverlaysFromStorage(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.status).toBe('accepted');

    const applied = applySuggestionOverlays(
      [{ path: 'context.yaml', content: BASE_CONTEXT }],
      loaded
    );
    expect(applied.applied).toHaveLength(1);

    await rejectSuggestionOverlayInStorage(storage, 'add-billing', '2026-08-04T13:00:00.000Z');
    const afterReject = await loadSuggestionOverlaysFromStorage(storage);
    expect(afterReject[0]?.status).toBe('rejected');
    expect(
      applySuggestionOverlays([{ path: 'context.yaml', content: BASE_CONTEXT }], afterReject)
        .applied
    ).toHaveLength(0);
  });
});
