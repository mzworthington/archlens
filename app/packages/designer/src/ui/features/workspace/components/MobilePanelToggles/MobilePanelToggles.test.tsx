import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MobilePanelToggles } from './MobilePanelToggles';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('MobilePanelToggles', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      leftCollapsed: true,
      rightCollapsed: true,
      isTraceLensPanelOpen: false,
      activeLeftPanel: 'codeViewer',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('opens the explorer panel from a labelled button', () => {
    render(<MobilePanelToggles />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Explorer' }));
    expect(useBlueprintStore.getState().leftCollapsed).toBe(false);
    expect(useBlueprintStore.getState().isTraceLensPanelOpen).toBe(true);
  });

  it('opens the properties panel from a labelled button', () => {
    render(<MobilePanelToggles />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Properties Panel' }));
    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);
  });

  it('hides when explorer is open', () => {
    useBlueprintStore.setState({ leftCollapsed: false, rightCollapsed: true });
    const { container } = render(<MobilePanelToggles />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides when properties panel is open', () => {
    useBlueprintStore.setState({ leftCollapsed: true, rightCollapsed: false });
    const { container } = render(<MobilePanelToggles />);
    expect(container).toBeEmptyDOMElement();
  });
});
