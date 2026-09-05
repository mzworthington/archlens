import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlankCanvasFileSave } from './BlankCanvasFileSave';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('BlankCanvasFileSave', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isWorkspaceOpen: false,
      schema: {
        name: 'Empty Workspace',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      },
      updateSchemaName: vi.fn(),
      saveSchema: vi.fn().mockResolvedValue(true),
    });
  });

  it('lets the user name the diagram and save YAML', async () => {
    const saveSchema = vi.fn().mockResolvedValue(true);
    const updateSchemaName = vi.fn();
    const onSaved = vi.fn();
    useBlueprintStore.setState({ saveSchema, updateSchemaName });

    render(<BlankCanvasFileSave onSaved={onSaved} />);

    const input = screen.getByLabelText('Workspace name');
    fireEvent.change(input, { target: { value: 'Checkout' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save YAML' }));

    await vi.waitFor(() => {
      expect(updateSchemaName).toHaveBeenCalledWith('Checkout');
      expect(saveSchema).toHaveBeenCalledTimes(1);
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  });

  it('saves when Enter is pressed in the name field', async () => {
    const saveSchema = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ saveSchema, updateSchemaName: vi.fn() });

    render(<BlankCanvasFileSave />);

    fireEvent.change(screen.getByLabelText('Workspace name'), {
      target: { value: 'Billing' },
    });
    fireEvent.submit(screen.getByLabelText('Workspace name').closest('form')!);

    await vi.waitFor(() => {
      expect(saveSchema).toHaveBeenCalledTimes(1);
    });
  });

  it('says when the diagram is still unsaved', () => {
    render(<BlankCanvasFileSave />);
    expect(screen.getByText('Unsaved — not on disk yet')).toBeInTheDocument();
  });

  it('replaces the boot placeholder and follows schema name updates', () => {
    useBlueprintStore.setState({
      schema: {
        name: 'Loading',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      },
    });
    const { rerender } = render(<BlankCanvasFileSave />);
    expect(screen.getByLabelText('Workspace name')).toHaveValue('Empty Workspace');

    useBlueprintStore.setState({
      schema: {
        name: 'Billing',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      },
    });
    rerender(<BlankCanvasFileSave />);
    expect(screen.getByLabelText('Workspace name')).toHaveValue('Billing');
  });
});
