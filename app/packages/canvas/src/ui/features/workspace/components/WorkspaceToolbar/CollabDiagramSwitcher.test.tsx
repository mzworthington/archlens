import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CollabDiagramSwitcher } from './CollabDiagramSwitcher';
import { useBlueprintStore } from '../../../../../application/store/store';

const schema = {
  name: 'Context',
  version: '1.0.0',
  level: 'container' as const,
  nodes: [],
  dependencies: [],
};

describe('CollabDiagramSwitcher', () => {
  it('switches diagrams inside the room', () => {
    const selectSystem = vi.fn().mockResolvedValue(undefined);
    useBlueprintStore.setState({
      collabRoomActive: true,
      currentFilePath: 'context.yaml',
      selectSystem,
      loadedSystems: [
        { path: 'context.yaml', name: 'Context', schema },
        { path: 'containers.yaml', name: 'Containers', schema: { ...schema, name: 'Containers' } },
      ],
    });

    render(<CollabDiagramSwitcher />);
    expect(screen.getByRole('navigation', { name: 'Diagrams in this room' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Containers' }));
    expect(selectSystem).toHaveBeenCalledWith('containers.yaml');
  });

  it('stays hidden when the room has one file', () => {
    useBlueprintStore.setState({
      collabRoomActive: true,
      loadedSystems: [{ path: 'context.yaml', name: 'Context', schema }],
    });

    render(<CollabDiagramSwitcher />);
    expect(screen.queryByRole('navigation', { name: 'Diagrams in this room' })).toBeNull();
  });
});
