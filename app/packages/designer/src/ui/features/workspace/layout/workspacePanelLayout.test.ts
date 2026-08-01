import { describe, it, expect } from 'vitest';
import {
  WORKSPACE_PANEL_SLOTS,
  panelsInSlot,
  resolveActivePanelInSlot,
} from './workspacePanelLayout';

describe('workspacePanelLayout', () => {
  it('assigns traceLens to the left slot by default', () => {
    expect(WORKSPACE_PANEL_SLOTS.traceLens).toBe('left');
    expect(WORKSPACE_PANEL_SLOTS.codeViewer).toBe('left');
    expect(WORKSPACE_PANEL_SLOTS.properties).toBe('right');
  });

  it('lists mutually exclusive left-slot panels', () => {
    expect(panelsInSlot('left')).toEqual(['codeViewer', 'traceLens']);
    expect(panelsInSlot('right')).toEqual(['properties']);
  });

  it('resolves active panel within a slot', () => {
    expect(resolveActivePanelInSlot('left', { left: 'traceLens' })).toBe('traceLens');
    expect(resolveActivePanelInSlot('left', { left: 'codeViewer' })).toBe('codeViewer');
    expect(resolveActivePanelInSlot('left', {})).toBe('codeViewer');
  });
});
