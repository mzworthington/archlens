import React from 'react';
import {
  COMMENT_AUTHOR_SWATCH_COUNT,
  commentAuthorSwatch,
  commentPresence,
  type NodeComment,
} from '@archlens/core';
import { useBlueprintStore } from '../../../../../application/store/store';

const COMMENT_AUTHOR_COLORS = [
  '#0f766e',
  '#1d4ed8',
  '#7c3aed',
  '#c2410c',
  '#be123c',
  '#b45309',
] as const satisfies readonly string[] & { readonly length: typeof COMMENT_AUTHOR_SWATCH_COUNT };

const SHOWN_AUTHORS = 3;

function authorInitial(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';
  return trimmed.slice(0, 1).toUpperCase();
}

function presenceLabel(count: number, names: readonly string[]): string {
  const noun = count === 1 ? 'open comment' : 'open comments';
  return `${count} ${noun} from ${names.join(', ')}`;
}

type NodeCommentMarkerProps = {
  entityRef?: string;
};

export const NodeCommentMarker: React.FC<NodeCommentMarkerProps> = ({ entityRef }) => {
  const collabRoomActive = useBlueprintStore(state => state.collabRoomActive);
  const connectedCount = useBlueprintStore(state => state.collabPresence.connectedCount);
  const collabComments = useBlueprintStore(state => state.collabComments);
  const persistedComments = useBlueprintStore(state => state.persistedComments);

  if (!entityRef) return null;

  const inRoom = collabRoomActive || connectedCount > 0;
  const comments: readonly NodeComment[] = inRoom ? collabComments : persistedComments;
  const presence = commentPresence(comments, entityRef);
  if (presence.count === 0) return null;

  const shown = presence.authors.slice(0, SHOWN_AUTHORS);
  const extraAuthors = presence.authors.length - shown.length;
  const label = presenceLabel(
    presence.count,
    presence.authors.map(author => author.name)
  );

  return (
    <div
      data-testid="node-comment-marker"
      role="img"
      aria-label={label}
      title={label}
      className="node-comment-marker pointer-events-none absolute -top-2.5 right-3 z-20 flex items-center gap-1 rounded-full px-1.5 py-0.5"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid rgba(15, 118, 110, 0.45)',
        boxShadow: '0 1px 2px rgba(21, 32, 51, 0.12)',
      }}
    >
      <span className="flex items-center">
        {shown.map((author, index) => (
          <span
            key={author.id}
            data-testid={`node-comment-author-${author.id}`}
            data-swatch={commentAuthorSwatch(author.id)}
            title={author.name}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold"
            style={{
              backgroundColor: COMMENT_AUTHOR_COLORS[commentAuthorSwatch(author.id)],
              color: '#ffffff',
              marginLeft: index === 0 ? 0 : -4,
              boxShadow: '0 0 0 1px #ffffff',
            }}
          >
            {authorInitial(author.name)}
          </span>
        ))}
      </span>
      {extraAuthors > 0 ? (
        <span className="text-[9px] font-semibold" style={{ color: '#0f172a' }}>
          +{extraAuthors}
        </span>
      ) : null}
      <span className="text-[10px] font-bold tabular-nums" style={{ color: '#0f172a' }}>
        {presence.count}
      </span>
    </div>
  );
};
