import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TraceLensScopePicker } from './TraceLensScopePicker';

const options = [
  {
    entityRef: 'app/canvas',
    name: 'Canvas',
    level: 'container' as const,
    depth: 2,
    offenderCount: 2,
  },
  {
    entityRef: 'app/canvas/db',
    name: 'DB Layer',
    level: 'component' as const,
    depth: 3,
    offenderCount: 1,
  },
  {
    entityRef: 'app/cli',
    name: 'CLI',
    level: 'container' as const,
    depth: 2,
    offenderCount: 1,
  },
];

describe('TraceLensScopePicker', () => {
  it('shows all entities by default and opens searchable menu', () => {
    const onChange = vi.fn();
    render(<TraceLensScopePicker options={options} value={null} onChange={onChange} />);

    expect(screen.getByText('All entities')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tracelens-scope-picker-trigger'));
    expect(screen.getByTestId('tracelens-scope-picker-menu')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search entity scope'), {
      target: { value: 'canvas' },
    });
    expect(screen.getByTestId('tracelens-scope-option-app/canvas')).toBeInTheDocument();
    expect(screen.queryByTestId('tracelens-scope-option-app/cli')).not.toBeInTheDocument();
  });

  it('selects an entity scope and can clear it', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TraceLensScopePicker options={options} value={null} onChange={onChange} />
    );

    fireEvent.click(screen.getByTestId('tracelens-scope-picker-trigger'));
    fireEvent.click(screen.getByTestId('tracelens-scope-option-app/canvas'));
    expect(onChange).toHaveBeenCalledWith('app/canvas');

    rerender(<TraceLensScopePicker options={options} value="app/canvas" onChange={onChange} />);
    expect(screen.getByText('Canvas')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tracelens-scope-picker-clear'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
