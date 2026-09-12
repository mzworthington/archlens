import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DemoGraduateCtas } from './DemoGraduateCtas';
import { useBlueprintStore } from '../../../application/store/store';

describe('DemoGraduateCtas', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isSampleWorkspace: true,
      openBrowserLiteScan: vi.fn(async () => true),
    });
  });

  it('is hidden off the demo workspace', () => {
    useBlueprintStore.setState({ isSampleWorkspace: false });
    const { container } = render(<DemoGraduateCtas />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names browser scan and CLI actions and keeps them keyboard reachable', () => {
    const openBrowserLiteScan = vi.fn(async () => true);
    useBlueprintStore.setState({ openBrowserLiteScan });
    render(<DemoGraduateCtas />);

    fireEvent.click(screen.getByRole('button', { name: 'Scan your repo in the browser' }));
    expect(openBrowserLiteScan).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Install CLI for watch and CI' }));
    expect(screen.getByTestId('demo-graduate-ctas-cli-install')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy install command' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy scan command' })).toBeInTheDocument();
  });
});
