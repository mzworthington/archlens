import React from 'react';
import { ViewportPortal } from '@xyflow/react';
import type { CollabPeerCursor } from '../../../../../core';

export function CollabCursorMarkers({ cursors }: { cursors: CollabPeerCursor[] }) {
  return (
    <>
      {cursors.map(cursor => (
        <div
          key={cursor.clientId}
          data-testid={`collab-cursor-${cursor.clientId}`}
          data-collab-name={cursor.name}
          className="absolute pointer-events-none z-[20] flex items-start gap-1"
          style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
        >
          <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true">
            <path
              d="M1.2 1.2 1.2 16.5 5.2 12.6 7.8 19.1 10.6 17.8 8 11.4 14.2 11.4Z"
              fill={cursor.color}
              stroke="#0f172a"
              strokeWidth="1"
            />
          </svg>
          <span
            className="mt-3 max-w-[12rem] truncate rounded-sm px-2 py-0.5 text-xs font-semibold text-slate-950 shadow-sm"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </span>
        </div>
      ))}
    </>
  );
}

export const CollabCursors: React.FC<{ cursors: CollabPeerCursor[] }> = ({ cursors }) => {
  if (cursors.length === 0) return null;
  return (
    <ViewportPortal>
      <div aria-hidden="true">
        <CollabCursorMarkers cursors={cursors} />
      </div>
    </ViewportPortal>
  );
};
