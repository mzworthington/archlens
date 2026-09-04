import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CollabShareDialog } from './CollabShareDialog';

describe('CollabShareDialog', () => {
  it('lists who is online and lets you rename before copying the link', () => {
    const onCopyLink = vi.fn();
    const onSaveName = vi.fn().mockReturnValue(true);
    render(
      <CollabShareDialog
        isOpen
        initialName="Ada"
        participants={[
          { clientId: 1, name: 'Ada', color: '#38bdf8', isLocal: true },
          { clientId: 2, name: 'Grace', color: '#a78bfa', isLocal: false },
        ]}
        onCopyLink={onCopyLink}
        onSaveName={onSaveName}
        onCancel={() => undefined}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Live diagram' })).toBeInTheDocument();
    expect(screen.getByTestId('collab-share-roster')).toHaveTextContent('Grace');
    expect(screen.getByText('you')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada Lovelace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(onSaveName).toHaveBeenCalledWith('Ada Lovelace');

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onCopyLink).toHaveBeenCalledWith('Ada Lovelace', {
      access: 'open',
      secret: '',
      expiresInHours: 0,
    });
  });

  it('lets the host require a labelled secret instead of anyone-with-the-link', () => {
    const onCopyLink = vi.fn();
    render(
      <CollabShareDialog
        isOpen
        initialName="Ada"
        participants={[]}
        onCopyLink={onCopyLink}
        onSaveName={() => true}
        onCancel={() => undefined}
      />
    );

    expect(screen.getByText('Anyone with the link')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Require a secret/i }));
    const secret = screen.getByLabelText('Room secret');
    expect(secret).toHaveAttribute('type', 'password');
    expect(secret).toHaveAttribute('autocomplete', 'new-password');
    fireEvent.change(secret, { target: { value: 'correct-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onCopyLink).toHaveBeenCalledWith('Ada', {
      access: 'secret',
      secret: 'correct-secret',
      expiresInHours: 0,
    });
  });

  it('says you will be first when the roster is empty', () => {
    render(
      <CollabShareDialog
        isOpen
        participants={[]}
        onCopyLink={() => undefined}
        onSaveName={() => true}
        onCancel={() => undefined}
      />
    );
    expect(screen.getByTestId('collab-share-empty-roster')).toHaveTextContent(
      'You will be the first person in this session.'
    );
  });
});
