import { describe, expect, it, beforeEach } from 'vitest';
import {
  beginWorkspaceOpen,
  claimDemoBootstrap,
  isFolderWorkspacePreferred,
  isWorkspaceOpenCurrent,
  markDemoWorkspacePreferred,
  markFolderWorkspacePreferred,
  releaseDemoBootstrapClaim,
  resetWorkspaceOpenSessionForTests,
} from './workspaceOpenSession';

describe('workspaceOpenSession', () => {
  beforeEach(() => {
    resetWorkspaceOpenSessionForTests();
  });

  it('invalidates older open generations', () => {
    const first = beginWorkspaceOpen();
    expect(isWorkspaceOpenCurrent(first)).toBe(true);
    const second = beginWorkspaceOpen();
    expect(isWorkspaceOpenCurrent(first)).toBe(false);
    expect(isWorkspaceOpenCurrent(second)).toBe(true);
  });

  it('blocks demo bootstrap after a folder is preferred', () => {
    expect(claimDemoBootstrap()).toBe(true);
    releaseDemoBootstrapClaim();
    expect(claimDemoBootstrap()).toBe(true);

    markFolderWorkspacePreferred();
    expect(isFolderWorkspacePreferred()).toBe(true);
    expect(claimDemoBootstrap()).toBe(false);

    markDemoWorkspacePreferred();
    expect(isFolderWorkspacePreferred()).toBe(false);
    releaseDemoBootstrapClaim();
    expect(claimDemoBootstrap()).toBe(true);
  });

  it('claims demo bootstrap only once until released', () => {
    expect(claimDemoBootstrap()).toBe(true);
    expect(claimDemoBootstrap()).toBe(false);
    releaseDemoBootstrapClaim();
    expect(claimDemoBootstrap()).toBe(true);
  });
});
