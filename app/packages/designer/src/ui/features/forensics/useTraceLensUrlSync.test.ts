import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoadedSystemRef } from '../../../application/forensics/rankOffenders';
import { useTraceLensUrlSync } from './useTraceLensUrlSync';

const setLocation = vi.fn();
let mockLocation = '/tracelens/backstage/plugins/devtools/app/App';
let mockSearch = '?plan=backstage%2Fplugins%2Fdevtools%2Fapp%2FApp';

vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, setLocation],
  useSearch: () => mockSearch,
}));

const offenderEntityRef = 'backstage/plugins/devtools/app/App';

const loadedSystems: LoadedSystemRef[] = [
  {
    path: 'plugins/devtools-app-components.yaml',
    name: 'devtools App',
    schema: {
      name: 'App Components',
      version: '1.0.0',
      level: 'component',
      entityRef: 'backstage/plugins/devtools/app',
      nodes: [
        {
          entityRef: offenderEntityRef,
          type: 'rest-api',
          name: 'Application Layer',
          properties: { filepath: 'plugins/devtools/src/app/App.tsx' },
          forensics: {
            hotspotScore: 0.5,
            complexity: 20,
            churn: 0.4,
            topAuthorPercent: 0.4,
            classifications: ['hotspot'],
            sinceDays: 365,
          },
        },
        {
          entityRef: 'backstage/plugins/devtools/app/helper',
          type: 'background-worker',
          name: 'Helper',
          properties: { filepath: 'plugins/devtools/src/app/helper.ts' },
          forensics: {
            hotspotScore: 0.4,
            complexity: 10,
            churn: 0.3,
            topAuthorPercent: 0.5,
            classifications: ['hotspot'],
          },
        },
      ],
      dependencies: [
        {
          from: offenderEntityRef,
          to: 'backstage/plugins/devtools/app/helper',
          type: 'direct-call',
        },
      ],
    },
  },
];

describe('useTraceLensUrlSync', () => {
  beforeEach(() => {
    mockLocation = '/tracelens/backstage/plugins/devtools/app/App';
    mockSearch = '?plan=backstage%2Fplugins%2Fdevtools%2Fapp%2FApp';
    setLocation.mockReset();
  });

  it('keeps the refactor plan closed after the user dismisses a legacy scoped deep link', () => {
    const setActivePlan = vi.fn();
    const clearActivePlan = vi.fn();

    const { rerender } = renderHook(
      ({ activePlan }: { activePlan: string | null }) =>
        useTraceLensUrlSync({
          loadedSystems,
          scopeEntityRef: offenderEntityRef,
          legacyPlanEntityRef: offenderEntityRef,
          activePlanEntityRef: activePlan,
          setActivePlan,
          clearActivePlan,
          isSourceCodeOpen: false,
          sourceCodeFilepath: null,
          openSourceCodeDialog: vi.fn(),
          closeSourceCodeDialog: vi.fn(),
        }),
      { initialProps: { activePlan: null as string | null } }
    );

    expect(setActivePlan).toHaveBeenCalledTimes(1);
    rerender({ activePlan: offenderEntityRef });

    rerender({ activePlan: null });
    expect(setLocation).toHaveBeenCalledWith('/tracelens/backstage/plugins/devtools/app/App', {
      replace: true,
    });

    const callsBeforeQueryStrip = setActivePlan.mock.calls.length;
    mockSearch = '';
    rerender({ activePlan: null });

    expect(setActivePlan.mock.calls.length).toBe(callsBeforeQueryStrip);
  });
});
