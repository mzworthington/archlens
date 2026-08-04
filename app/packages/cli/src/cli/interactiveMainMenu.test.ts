import { describe, expect, it } from 'vitest';
import {
  INTERACTIVE_MAIN_ACTIONS,
  buildInteractiveAcceptOverlayPlan,
  buildInteractiveComposePlan,
  buildInteractivePublishFragmentPlan,
  buildInteractivePublishPlan,
  buildInteractiveRejectOverlayPlan,
  shouldShowInteractiveMainMenu,
} from './interactiveMainMenu.ts';

describe('interactiveMainMenu', () => {
  it('lists scan plus catalog actions', () => {
    expect(INTERACTIVE_MAIN_ACTIONS.map(a => a.value)).toEqual([
      'scan',
      'publish',
      'publish-fragment',
      'compose',
      'accept-overlay',
      'reject-overlay',
    ]);
  });

  it('shows the menu only for bare interactive runs', () => {
    expect(
      shouldShowInteractiveMainMenu({
        isHeadless: false,
        watch: false,
        runEnrichOnly: false,
        publishAfterScan: false,
      })
    ).toBe(true);
    expect(
      shouldShowInteractiveMainMenu({
        isHeadless: true,
        watch: false,
        runEnrichOnly: false,
        publishAfterScan: false,
      })
    ).toBe(false);
    expect(
      shouldShowInteractiveMainMenu({
        isHeadless: false,
        watch: true,
        runEnrichOnly: false,
        publishAfterScan: false,
      })
    ).toBe(false);
  });

  it('builds publish and fragment plans with dry-run defaults', () => {
    expect(
      buildInteractivePublishPlan({
        targetPath: 'blueprints/',
        workspaceName: 'acme',
        upload: false,
      })
    ).toMatchObject({
      targetPath: 'blueprints/',
      workspaceName: 'acme',
      dryRun: true,
      skipValidation: true,
    });

    expect(
      buildInteractivePublishFragmentPlan({
        targetPath: 'out',
        estateId: 'acme',
        productId: 'payments',
        sourceRef: 'repo@1',
        upload: true,
      })
    ).toMatchObject({
      estateId: 'acme',
      productId: 'payments',
      keyPrefix: 'estates/acme',
      dryRun: false,
      skipValidation: true,
    });
  });

  it('builds compose and overlay plans', () => {
    expect(
      buildInteractiveComposePlan({
        estateId: 'acme',
        upload: true,
        allowEmpty: true,
      })
    ).toMatchObject({
      estateId: 'acme',
      keyPrefix: 'estates/acme',
      dryRun: false,
      allowEmpty: true,
      maxRetries: 3,
    });

    expect(
      buildInteractiveAcceptOverlayPlan({
        estateId: 'acme',
        overlayFile: 'overlay.yaml',
        upload: false,
      })
    ).toMatchObject({
      overlayFile: 'overlay.yaml',
      dryRun: true,
      keyPrefix: 'estates/acme',
    });

    expect(
      buildInteractiveRejectOverlayPlan({
        estateId: 'acme',
        overlayId: 'add-billing',
        upload: true,
      })
    ).toMatchObject({
      overlayId: 'add-billing',
      dryRun: false,
    });
  });
});
