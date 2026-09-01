import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MermaidPreview } from './MermaidPreview';
import mermaid from 'mermaid';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

type MermaidRenderResult = { svg: string; diagramType: string };

describe('MermaidPreview Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially then displays rendered SVG', async () => {
    let resolveRender: (val: MermaidRenderResult) => void = () => {};
    const renderPromise = new Promise<MermaidRenderResult>(resolve => {
      resolveRender = resolve;
    });
    vi.mocked(mermaid.render).mockImplementation(() => renderPromise);

    render(<MermaidPreview code="graph TD; A-->B;" />);

    expect(screen.getByText('Generating flowchart...')).toBeInTheDocument();

    resolveRender({ svg: '<svg data-testid="mock-svg">Mock SVG</svg>', diagramType: 'flowchart' });

    await waitFor(() => {
      expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
    });
  });

  it('displays visualization error when render fails', async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error('Syntax error'));

    render(<MermaidPreview code="graph TD; A-->B;" />);

    await waitFor(() => {
      expect(screen.getByText('Visualization Error')).toBeInTheDocument();
      expect(
        screen.getByText('Could not render preview diagram. Please verify configuration.')
      ).toBeInTheDocument();
    });
  });

  it('opens and closes expanded portal view', async () => {
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg data-testid="mock-svg">Mock SVG</svg>',
      diagramType: 'flowchart',
    });

    render(<MermaidPreview code="graph TD; A-->B;" />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
    });

    const trigger = screen.getByText('Click to Expand');
    fireEvent.click(trigger);

    expect(screen.getByRole('button', { name: 'Close Preview' })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close Preview' });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('button', { name: 'Close Preview' })).not.toBeInTheDocument();
  });
});
