import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TraceLensScopePicker } from './TraceLensScopePicker';

const options = [
  {
    entityRef: 'app/designer',
    name: 'Designer',
    level: 'container' as const,
    depth: 2,
    offenderCount: 2,
  },
  {
    entityRef: 'app/designer/db',
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
      target: { value: 'designer' },
    });
    expect(screen.getByTestId('tracelens-scope-option-app/designer')).toBeInTheDocument();
    expect(screen.queryByTestId('tracelens-scope-option-app/cli')).not.toBeInTheDocument();
  });

  it('selects an entity scope and can clear it', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TraceLensScopePicker options={options} value={null} onChange={onChange} />
    );

    fireEvent.click(screen.getByTestId('tracelens-scope-picker-trigger'));
    fireEvent.click(screen.getByTestId('tracelens-scope-option-app/designer'));
    expect(onChange).toHaveBeenCalledWith('app/designer');

    rerender(<TraceLensScopePicker options={options} value="app/designer" onChange={onChange} />);
    expect(screen.getByText('Designer')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tracelens-scope-picker-clear'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
