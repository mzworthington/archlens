import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CollabNameDialog } from './CollabNameDialog';

describe('CollabNameDialog', () => {
  it('asks a guest to name themselves before joining', () => {
    const onConfirm = vi.fn();
    render(
      <CollabNameDialog
        isOpen
        initialName="Grace"
        onConfirm={onConfirm}
        onCancel={() => undefined}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Join live diagram' })).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toHaveValue('Grace');
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(onConfirm).toHaveBeenCalledWith('Grace');
  });

  it('does not render when closed', () => {
    render(
      <CollabNameDialog isOpen={false} onConfirm={() => undefined} onCancel={() => undefined} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
