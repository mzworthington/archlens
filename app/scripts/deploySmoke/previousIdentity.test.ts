import { describe, expect, it } from 'vitest';
import {
  pickPreviousPagesDeploymentId,
  pickPreviousWorkerVersionId,
  rollbackPlan,
} from './previousIdentity.ts';

describe('pickPreviousPagesDeploymentId', () => {
  it('takes the newest successful production deployment as the restore identity', () => {
    expect(
      pickPreviousPagesDeploymentId({
        result: [
          { id: 'new', environment: 'production', latest_stage: { status: 'success' } },
          { id: 'old', environment: 'production', latest_stage: { status: 'success' } },
        ],
      })
    ).toBe('new');
  });

  it('skips preview and failed production rows', () => {
    expect(
      pickPreviousPagesDeploymentId({
        result: [
          { id: 'preview', environment: 'preview', latest_stage: { status: 'success' } },
          { id: 'failed', environment: 'production', latest_stage: { status: 'failure' } },
          { id: 'live', environment: 'production', latest_stage: { status: 'success' } },
        ],
      })
    ).toBe('live');
  });

  it('returns null when nothing is restorable', () => {
    expect(pickPreviousPagesDeploymentId({ result: [] })).toBeNull();
  });
});

describe('pickPreviousWorkerVersionId', () => {
  it('reads the 100% version from the newest deployment', () => {
    expect(
      pickPreviousWorkerVersionId({
        result: {
          deployments: [
            {
              versions: [{ version_id: 'current', percentage: 100 }],
            },
            {
              versions: [{ version_id: 'older', percentage: 100 }],
            },
          ],
        },
      })
    ).toBe('current');
  });

  it('returns null when deployments are empty', () => {
    expect(pickPreviousWorkerVersionId({ result: { deployments: [] } })).toBeNull();
  });
});

describe('rollbackPlan', () => {
  it('restores the captured identity when smoke fails and a previous identity exists', () => {
    expect(
      rollbackPlan({
        smokeOk: false,
        previousId: 'dep-1',
      })
    ).toEqual({ action: 'restore', previousId: 'dep-1' });
  });

  it('does not restore when smoke passed', () => {
    expect(rollbackPlan({ smokeOk: true, previousId: 'dep-1' })).toEqual({ action: 'none' });
  });

  it('fails loud when smoke failed and there is no previous identity', () => {
    expect(rollbackPlan({ smokeOk: false, previousId: null })).toEqual({ action: 'fail-loud' });
  });
});
