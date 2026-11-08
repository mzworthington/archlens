import * as yaml from 'js-yaml';
import {
  addComment,
  emptyCommentDocument,
  parseNodeComment,
  type CollabCommentDocument,
  type NodeComment,
} from './collabComments';

/**
 * Derive the sidecar file path from a diagram path.
 *
 * "diagram.yaml"       → "diagram.comments.yaml"
 * "my/path/ctx.yml"    → "my/path/ctx.comments.yaml"
 * "no-extension"       → "no-extension.comments.yaml"
 */
export function commentSidecarPath(diagramPath: string): string {
  const yamlExt = /\.(ya?ml)$/i;
  const match = yamlExt.exec(diagramPath);
  if (match) {
    return diagramPath.slice(0, match.index) + '.comments.yaml';
  }
  return diagramPath + '.comments.yaml';
}

/**
 * Merge live (collab/standalone) comments into a persisted document.
 *
 * Last-write-wins by `createdAtMs`. Resolved comments are kept for audit.
 * A comment that exists in both uses the one with the higher `createdAtMs`
 * (incoming wins a tie, so a resolve propagates). Comments present only in
 * `persisted` are kept. A room delete drops the row, so it is absent from
 * `incoming` — mirror a live room with `projectRoomComments` instead.
 */
export function mergeCommentDocuments(
  persisted: CollabCommentDocument,
  incoming: readonly NodeComment[]
): CollabCommentDocument {
  let result = persisted;
  for (const comment of incoming) {
    const existing = result.comments[comment.id];
    if (!existing || comment.createdAtMs >= existing.createdAtMs) {
      result = addComment(result, comment);
    }
  }
  return result;
}

/**
 * Project a live room snapshot onto a sidecar document.
 *
 * `incoming` is the full room set. An id in `seenRoomIds` that is missing from
 * `incoming` was deleted in the room and is removed. Sidecar comments that
 * never appeared in the room are kept, so an unseeded document is not wiped.
 */
export function projectRoomComments(
  persisted: CollabCommentDocument,
  incoming: readonly NodeComment[],
  seenRoomIds: ReadonlySet<string>
): CollabCommentDocument {
  const incomingIds = new Set(incoming.map(comment => comment.id));
  let kept = emptyCommentDocument();
  for (const comment of Object.values(persisted.comments)) {
    if (seenRoomIds.has(comment.id) && !incomingIds.has(comment.id)) continue;
    kept = addComment(kept, comment);
  }
  return mergeCommentDocuments(kept, incoming);
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

type CommentSidecarWire = {
  version: '1';
  comments: Record<string, CommentWireRow>;
};

type CommentWireRow = {
  id: string;
  nodeEntityRef: string;
  authorName: string;
  authorKey?: string;
  body: string;
  /** ISO-8601 — human-readable timestamp written to disk. */
  createdAt: string;
  status: string;
};

function toWireRow(comment: NodeComment): CommentWireRow {
  return {
    id: comment.id,
    nodeEntityRef: comment.nodeEntityRef,
    authorName: comment.authorName,
    ...(comment.authorKey ? { authorKey: comment.authorKey } : {}),
    body: comment.body,
    createdAt: new Date(comment.createdAtMs).toISOString(),
    status: comment.status,
  };
}

function fromWireRow(raw: unknown): NodeComment | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;

  // Support both ISO string (new format) and raw ms number (forward-compat).
  let createdAtMs: number | undefined;
  if (typeof rec.createdAt === 'string') {
    const parsed = Date.parse(rec.createdAt);
    if (!Number.isFinite(parsed)) return null;
    createdAtMs = parsed;
  } else if (typeof rec.createdAtMs === 'number' && Number.isFinite(rec.createdAtMs)) {
    createdAtMs = rec.createdAtMs;
  } else {
    return null;
  }

  return parseNodeComment({ ...rec, createdAtMs, authorClientId: rec.authorClientId ?? 0 });
}

export function serializeCommentDocument(doc: CollabCommentDocument): string {
  const wire: CommentSidecarWire = {
    version: '1',
    comments: {},
  };
  for (const [id, comment] of Object.entries(doc.comments)) {
    wire.comments[id] = toWireRow(comment);
  }
  return yaml.dump(wire, { lineWidth: 120 });
}

export function parseCommentDocument(raw: string): CollabCommentDocument {
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch {
    return emptyCommentDocument();
  }
  if (!parsed || typeof parsed !== 'object') return emptyCommentDocument();

  const rec = parsed as Record<string, unknown>;
  const commentsRaw = rec.comments;
  if (!commentsRaw || typeof commentsRaw !== 'object') return emptyCommentDocument();

  const result = emptyCommentDocument();
  for (const value of Object.values(commentsRaw as Record<string, unknown>)) {
    const comment = fromWireRow(value);
    if (comment) result.comments[comment.id] = comment;
  }
  return result;
}
