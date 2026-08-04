import { describe, expect, it } from 'vitest';
import { buildWorkspaceEntityHref } from './sandboxWorkspace';

describe('sandboxWorkspace', () => {
  it('builds entity-ref workspace paths', () => {
    expect(buildWorkspaceEntityHref('application')).toBe('/workspace/application');
    expect(buildWorkspaceEntityHref('samples/golden-journey')).toBe(
      '/workspace/samples/golden-journey'
    );
  });

  it('preserves AdviceLens when building breadcrumb links', () => {
    expect(
      buildWorkspaceEntityHref('application', {
        pathname: '/workspace',
        search: 'lens=advicelens',
      })
    ).toBe('/workspace/application?lens=advicelens');
  });

  it('preserves TraceLens when building breadcrumb links', () => {
    expect(
      buildWorkspaceEntityHref('samples/golden-journey', {
        pathname: '/workspace',
        search: 'lens=tracelens',
      })
    ).toBe('/workspace/samples/golden-journey?lens=tracelens');

    expect(
      buildWorkspaceEntityHref('application', {
        pathname: '/workspace',
        search: 'lens=tracelens&view=recommendations',
      })
    ).toBe('/workspace/application?lens=advicelens');
  });

  it('preserves ChaosLens when building breadcrumb links', () => {
    expect(
      buildWorkspaceEntityHref('application', {
        pathname: '/workspace/application',
        search: 'lens=chaoslens&faults=app%2Fapi~region-outage',
      })
    ).toBe('/workspace/application?lens=chaoslens&fault=app%2Fapi&type=region-outage');
  });
});
