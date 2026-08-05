import { describe, it, expect } from 'vitest';
import {
  ADVICELENS_ENTRY_URL,
  buildAdviceLensUrl,
  isAdviceLensUrl,
  isWorkspaceTraceLensUrl,
  parseAdviceLensUrl,
} from './adviceLensUrl';

describe('adviceLensUrl', () => {
  it('builds workspace AdviceLens URLs', () => {
    expect(ADVICELENS_ENTRY_URL).toBe('/workspace?lens=advicelens');
    expect(buildAdviceLensUrl()).toBe('/workspace?lens=advicelens');
    expect(buildAdviceLensUrl('app/designer/db')).toBe(
      '/workspace/app/designer/db?lens=advicelens'
    );
    expect(buildAdviceLensUrl('app/designer', { planEntityRef: 'app/designer/db' })).toBe(
      '/workspace/app/designer?lens=advicelens&plan=app%2Fdesigner%2Fdb'
    );
  });

  it('parses workspace AdviceLens URLs', () => {
    expect(parseAdviceLensUrl('/workspace', 'lens=advicelens')).toEqual({ showSource: false });
    expect(parseAdviceLensUrl('/workspace/samples', 'lens=advicelens')).toEqual({
      entityRef: 'samples',
      showSource: false,
    });
  });

  it('detects AdviceLens only via lens=advicelens', () => {
    expect(isAdviceLensUrl('/workspace', 'lens=advicelens')).toBe(true);
    expect(isAdviceLensUrl('/advicelens')).toBe(false);
    expect(isAdviceLensUrl('/workspace', 'lens=tracelens&view=recommendations')).toBe(false);
    expect(isWorkspaceTraceLensUrl('/workspace', 'lens=tracelens')).toBe(true);
    expect(isWorkspaceTraceLensUrl('/workspace', 'lens=tracelens&view=recommendations')).toBe(
      false
    );
    expect(isWorkspaceTraceLensUrl('/tracelens')).toBe(false);
  });
});
