import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NodeComment } from '@archlens/core';
import { NodeCommentsSection } from './NodeCommentsSection';

const openComment = (overrides: Partial<NodeComment> = {}): NodeComment => ({
  id: 'c1',
  nodeEntityRef: 'shop/api',
  authorName: 'Ada',
  authorClientId: 7,
  body: 'needs a gateway',
  createdAtMs: 1,
  status: 'open',
  ...overrides,
});

describe('NodeCommentsSection', () => {
  it('labels the comment field and renders bodies as text, not HTML', () => {
    render(
      <NodeCommentsSection
        nodeEntityRef="shop/api"
        comments={[openComment({ body: '<img alt="xss">bold</img>' })]}
        localClientId={7}
        onAdd={vi.fn()}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Comment')).toBeInTheDocument();
    expect(screen.getByText('<img alt="xss">bold</img>')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('adds, resolves, and deletes the local author comment', () => {
    const onAdd = vi.fn();
    const onResolve = vi.fn();
    const onDelete = vi.fn();
    render(
      <NodeCommentsSection
        nodeEntityRef="shop/api"
        comments={[openComment()]}
        localClientId={7}
        onAdd={onAdd}
        onResolve={onResolve}
        onDelete={onDelete}
      />
    );

    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'looks off' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(onAdd).toHaveBeenCalledWith({ nodeEntityRef: 'shop/api', body: 'looks off' });

    fireEvent.click(screen.getByRole('button', { name: 'Resolve comment' }));
    expect(onResolve).toHaveBeenCalledWith('c1');
    fireEvent.click(screen.getByRole('button', { name: 'Delete comment' }));
    expect(onDelete).toHaveBeenCalledWith('c1');
  });
});
