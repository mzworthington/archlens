import { describe, expect, it } from 'vitest';
import { parseSchemaFromYaml } from '../rules/graph';
import {
  applySuggestionOverlays,
  defaultOverlayId,
  parseSuggestionOverlayYaml,
  serializeSuggestionOverlay,
  suggestionOverlayObjectKey,
  tombstoneSuggestionOverlay,
  type SuggestionOverlay,
} from './suggestionOverlay';

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

function overlay(
  partial: Partial<SuggestionOverlay> & Pick<SuggestionOverlay, 'overlayId'>
): SuggestionOverlay {
  return {
    version: 1,
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
      dependencies: [
        {
          from: 'estate/payments',
          to: 'estate/billing-api',
          type: 'direct-call',
        },
      ],
    },
    ...partial,
  };
}

describe('Feature: suggestion overlays', () => {
  it('round-trips overlay documents and builds storage keys', () => {
    const doc = overlay({ overlayId: 'add-dependent--billing' });
    const fromYaml = parseSuggestionOverlayYaml(serializeSuggestionOverlay(doc));
    expect(fromYaml.overlayId).toBe('add-dependent--billing');
    expect(suggestionOverlayObjectKey(fromYaml.overlayId)).toBe(
      'overlays/add-dependent--billing.yaml'
    );
    expect(
      defaultOverlayId({
        kind: 'add-dependent',
        targetEntityRef: 'estate/payments',
        dependentEntityRef: 'estate/billing-api',
        acceptedAt: '2026-08-04T12:00:00.000Z',
      })
    ).toContain('add-dependent');
  });

  it('Scenario: accepted add-dependent overlays merge into context.yaml', () => {
    const result = applySuggestionOverlays(
      [{ path: 'context.yaml', content: BASE_CONTEXT }],
      [overlay({ overlayId: 'add-billing' })]
    );

    expect(result.applied).toHaveLength(1);
    const schema = parseSchemaFromYaml(
      result.yamlObjects.find(o => o.path === 'context.yaml')!.content
    );
    expect(schema.nodes.map(n => n.entityRef).sort()).toEqual([
      'estate/billing-api',
      'estate/payments',
    ]);
    expect(schema.dependencies).toHaveLength(1);
  });

  it('Scenario: rejected overlays are skipped (tombstone)', () => {
    const rejected = tombstoneSuggestionOverlay(
      overlay({ overlayId: 'add-billing' }),
      '2026-08-04T13:00:00.000Z'
    );
    const result = applySuggestionOverlays(
      [{ path: 'context.yaml', content: BASE_CONTEXT }],
      [rejected]
    );
    expect(result.applied).toHaveLength(0);
    expect(result.skippedRejected).toBe(1);
    expect(parseSchemaFromYaml(result.yamlObjects[0]!.content).nodes).toHaveLength(1);
  });

  it('applies overlays in acceptedAt order', () => {
    const first = overlay({
      overlayId: 'a',
      acceptedAt: '2026-01-01T00:00:00.000Z',
      delta: {
        nodes: [{ entityRef: 'estate/a', type: 'software-system', name: 'A', external: true }],
        dependencies: [],
      },
    });
    const second = overlay({
      overlayId: 'b',
      acceptedAt: '2026-02-01T00:00:00.000Z',
      delta: {
        nodes: [{ entityRef: 'estate/b', type: 'software-system', name: 'B', external: true }],
        dependencies: [],
      },
    });
    const result = applySuggestionOverlays(
      [{ path: 'context.yaml', content: BASE_CONTEXT }],
      [second, first]
    );
    expect(result.applied.map(o => o.overlayId)).toEqual(['a', 'b']);
  });

  it('rejects overlay dependency endpoints that are not entityRefs', () => {
    const invalid = serializeSuggestionOverlay(
      overlay({
        overlayId: 'bad-dep',
        delta: {
          nodes: [],
          dependencies: [
            {
              from: 'estate/payments',
              to: '../billing.yaml',
              type: 'direct-call',
            },
          ],
        },
      })
    );
    expect(() => parseSuggestionOverlayYaml(invalid)).toThrow(/entityRef/);
  });
});
