import React, { useState } from 'react';
import { listOpenComments, type NodeComment } from '@archlens/core';

type NodeCommentsSectionProps = {
  nodeEntityRef: string;
  comments: NodeComment[];
  localClientId: number | null;
  onAdd: (input: { nodeEntityRef: string; body: string }) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
};

export const NodeCommentsSection: React.FC<NodeCommentsSectionProps> = ({
  nodeEntityRef,
  comments,
  localClientId,
  onAdd,
  onResolve,
  onDelete,
}) => {
  const [draft, setDraft] = useState('');
  const commentInputId = `node-comment-${nodeEntityRef}`;
  const open = listOpenComments(comments, nodeEntityRef);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onAdd({ nodeEntityRef, body });
    setDraft('');
  };

  return (
    <div className="border-t border-slate-900 pt-4" data-testid="node-comments-section">
      <h4 className="text-[10px] font-bold font-mono text-[#00f0ff] uppercase tracking-wider mb-3">
        Comments
      </h4>

      <ul className="space-y-3 mb-3" aria-label="Open thread">
        {open.map(comment => {
          const mine = localClientId !== null && comment.authorClientId === localClientId;
          return (
            <li
              key={comment.id}
              className="rounded-xl border border-slate-900 bg-slate-950/40 px-3 py-2"
              data-testid={`node-comment-${comment.id}`}
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                {comment.authorName}
              </p>
              <p className="text-xs text-slate-200 whitespace-pre-wrap break-words">
                {comment.body}
              </p>
              {mine ? (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onResolve(comment.id)}
                    className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 hover:text-cyan-200 cursor-pointer"
                  >
                    Resolve comment
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    className="text-[10px] font-mono uppercase tracking-wider text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Delete comment
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <form onSubmit={submit} className="space-y-2">
        <label
          htmlFor={commentInputId}
          className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider"
        >
          Comment
        </label>
        <textarea
          id={commentInputId}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          rows={3}
          className="w-full bg-slate-950/60 border border-slate-800 focus:border-brand-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none transition"
        />
        <button
          type="submit"
          className="w-full rounded-lg border border-cyan-900/40 bg-cyan-950/20 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-950/40 cursor-pointer"
        >
          Add comment
        </button>
      </form>
    </div>
  );
};
