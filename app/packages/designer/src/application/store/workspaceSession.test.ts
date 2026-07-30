import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveWorkspaceSession,
  loadWorkspaceSession,
  clearWorkspaceSession,
} from './workspaceSession';

describe('workspaceSession', () => {
  beforeEach(() => {
    clearWorkspaceSession();
  });

  it('persists and loads sandbox session metadata', () => {
    saveWorkspaceSession({ mode: 'sandbox' });
    expect(loadWorkspaceSession()).toEqual({ mode: 'sandbox' });
  });

  it('persists folder workspace name', () => {
    saveWorkspaceSession({ mode: 'folder', workspaceName: 'my-blueprints' });
    expect(loadWorkspaceSession()).toEqual({ mode: 'folder', workspaceName: 'my-blueprints' });
  });

  it('clears stored session', () => {
    saveWorkspaceSession({ mode: 'sandbox' });
    clearWorkspaceSession();
    expect(loadWorkspaceSession()).toBeNull();
  });
});
