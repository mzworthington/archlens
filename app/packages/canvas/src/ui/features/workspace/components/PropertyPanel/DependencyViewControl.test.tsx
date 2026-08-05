import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DependencyViewControl } from './DependencyViewControl';

describe('DependencyViewControl', () => {
  it('calls onChange when a segment is selected', () => {
    const onChange = vi.fn();
    render(<DependencyViewControl mode="focus" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('dependency-view-focus-externals'));
    expect(onChange).toHaveBeenCalledWith('focus-externals');
  });
});
