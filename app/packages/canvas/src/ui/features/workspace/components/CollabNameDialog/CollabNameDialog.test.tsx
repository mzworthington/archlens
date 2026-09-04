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
    expect(onConfirm).toHaveBeenCalledWith('Grace', '');
  });

  it('sends a labelled room secret so a password manager can fill it', () => {
    const onConfirm = vi.fn();
    render(
      <CollabNameDialog isOpen initialName="Ada" onConfirm={onConfirm} onCancel={() => undefined} />
    );
    const secret = screen.getByLabelText('Room secret');
    expect(secret).toHaveAttribute('type', 'password');
    expect(secret).toHaveAttribute('autocomplete', 'current-password');
    fireEvent.change(secret, { target: { value: 'correct-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(onConfirm).toHaveBeenCalledWith('Ada', 'correct-secret');
  });

  it('keeps the guest out and names the mismatch', () => {
    render(
      <CollabNameDialog
        isOpen
        joinError="That secret does not match. The diagram is still hidden."
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    );
    expect(
      screen.getByText('That secret does not match. The diagram is still hidden.')
    ).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <CollabNameDialog isOpen={false} onConfirm={() => undefined} onCancel={() => undefined} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
