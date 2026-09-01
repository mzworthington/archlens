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
    expect(onCopyLink).toHaveBeenCalledWith('Ada Lovelace');
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
