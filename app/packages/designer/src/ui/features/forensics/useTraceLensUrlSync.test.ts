import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoadedSystemRef } from '../../../application/forensics/rankOffenders';
import { useTraceLensUrlSync } from './useTraceLensUrlSync';

const setLocation = vi.fn();
let mockLocation = '/workspace/backstage/plugins/devtools/app/App';
let mockSearch = '?lens=tracelens&plan=backstage%2Fplugins%2Fdevtools%2Fapp%2FApp';

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
    mockLocation = '/workspace/backstage/plugins/devtools/app/App';
    mockSearch = '?lens=tracelens&plan=backstage%2Fplugins%2Fdevtools%2Fapp%2FApp';
    setLocation.mockReset();
  });

  it('opens a refactor plan only when ?plan= is present', () => {
    const setActivePlan = vi.fn();
    const clearActivePlan = vi.fn();

    mockSearch = '?lens=tracelens';
    renderHook(() =>
      useTraceLensUrlSync({
        loadedSystems,
        scopeEntityRef: offenderEntityRef,
        activePlanEntityRef: null,
        setActivePlan,
        clearActivePlan,
        isSourceCodeOpen: false,
        sourceCodeFilepath: null,
        openSourceCodeDialog: vi.fn(),
        closeSourceCodeDialog: vi.fn(),
      })
    );

    expect(setActivePlan).not.toHaveBeenCalled();
  });

  it('keeps the refactor plan closed after the user dismisses a ?plan= deep link', () => {
    const setActivePlan = vi.fn();
    const clearActivePlan = vi.fn();

    const { rerender } = renderHook(
      ({ activePlan }: { activePlan: string | null }) =>
        useTraceLensUrlSync({
          loadedSystems,
          scopeEntityRef: offenderEntityRef,
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
    expect(setLocation).toHaveBeenCalledWith(
      '/workspace/backstage/plugins/devtools/app/App?lens=tracelens',
      {
        replace: true,
      }
    );

    const callsBeforeQueryStrip = setActivePlan.mock.calls.length;
    mockSearch = '?lens=tracelens';
    rerender({ activePlan: null });

    expect(setActivePlan.mock.calls.length).toBe(callsBeforeQueryStrip);
  });
});
