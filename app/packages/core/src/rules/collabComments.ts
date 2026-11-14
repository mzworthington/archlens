export type NodeCommentStatus = 'open' | 'resolved';

export type NodeComment = {
  id: string;
  nodeEntityRef: string;
  authorName: string;
  authorClientId: number;
  /** Stable across refresh. Absent on comments written before author keys existed. */
  authorKey?: string;
  body: string;
  createdAtMs: number;
  status: NodeCommentStatus;
};

export function commentBodyAsText(raw: string): string {
  return raw.trim();
}

export type CollabCommentDocument = {
  comments: Record<string, NodeComment>;
};

export function emptyCommentDocument(): CollabCommentDocument {
  return { comments: {} };
}

function commentAuthorKey(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const key = raw.trim();
  if (key.length < 1 || key.length > 80) return undefined;
  return key;
}

export function createNodeComment(input: {
  id: string;
  nodeEntityRef: string;
  authorName: string;
  authorClientId: number;
  authorKey?: string;
  body: string;
  createdAtMs: number;
}): NodeComment | null {
  const body = commentBodyAsText(input.body);
  if (!body) return null;
  const authorKey = commentAuthorKey(input.authorKey);
  return {
    id: input.id,
    nodeEntityRef: input.nodeEntityRef,
    authorName: input.authorName,
    authorClientId: input.authorClientId,
    ...(authorKey ? { authorKey } : {}),
    body,
    createdAtMs: input.createdAtMs,
    status: 'open',
  };
}

export function addComment(
  doc: CollabCommentDocument,
  comment: NodeComment
): CollabCommentDocument {
  return {
    comments: {
      ...doc.comments,
      [comment.id]: comment,
    },
  };
}

export function resolveComment(doc: CollabCommentDocument, id: string): CollabCommentDocument {
  const existing = doc.comments[id];
  if (!existing) return doc;
  return {
    comments: {
      ...doc.comments,
      [id]: { ...existing, status: 'resolved' },
    },
  };
}

export function deleteComment(doc: CollabCommentDocument, id: string): CollabCommentDocument {
  if (!(id in doc.comments)) return doc;
  const comments = { ...doc.comments };
  delete comments[id];
  return { comments };
}

export function listOpenComments(
  comments: readonly NodeComment[],
  nodeEntityRef: string
): NodeComment[] {
  return comments
    .filter(comment => comment.nodeEntityRef === nodeEntityRef && comment.status === 'open')
    .sort((a, b) => a.createdAtMs - b.createdAtMs || a.id.localeCompare(b.id));
}

export function openCommentsForNode(
  doc: CollabCommentDocument,
  nodeEntityRef: string
): NodeComment[] {
  return listOpenComments(Object.values(doc.comments), nodeEntityRef);
}

export type CommentAuthorMark = {
  id: string;
  name: string;
};

export type CommentPresence = {
  count: number;
  authors: CommentAuthorMark[];
};

export const COMMENT_AUTHOR_SWATCH_COUNT = 6;

export function commentAuthorSwatch(authorId: string): number {
  let hash = 0;
  for (const char of authorId) {
    hash = (hash * 33 + char.charCodeAt(0)) % 997;
  }
  return hash % COMMENT_AUTHOR_SWATCH_COUNT;
}

function commentAuthorId(comment: NodeComment): string {
  if (comment.authorKey) return comment.authorKey;
  const name = comment.authorName.trim().toLowerCase();
  return name.length > 0 ? `name:${name}` : `client:${comment.authorClientId}`;
}

export function commentPresence(
  comments: readonly NodeComment[],
  nodeEntityRef: string
): CommentPresence {
  const open = listOpenComments(comments, nodeEntityRef);
  const authors: CommentAuthorMark[] = [];
  const seen = new Set<string>();
  for (const comment of open) {
    const id = commentAuthorId(comment);
    if (seen.has(id)) continue;
    seen.add(id);
    const name = comment.authorName.trim();
    authors.push({ id, name: name.length > 0 ? name : 'Someone' });
  }
  return { count: open.length, authors };
}

const COMMENT_STATUSES = new Set<NodeCommentStatus>(['open', 'resolved']);

export function parseNodeComment(raw: unknown): NodeComment | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.id !== 'string' || rec.id.length === 0) return null;
  if (typeof rec.nodeEntityRef !== 'string' || rec.nodeEntityRef.length === 0) return null;
  if (typeof rec.authorName !== 'string') return null;
  if (typeof rec.authorClientId !== 'number' || !Number.isFinite(rec.authorClientId)) return null;
  if (typeof rec.body !== 'string') return null;
  if (typeof rec.createdAtMs !== 'number' || !Number.isFinite(rec.createdAtMs)) return null;
  if (typeof rec.status !== 'string' || !COMMENT_STATUSES.has(rec.status as NodeCommentStatus)) {
    return null;
  }
  const authorKey = commentAuthorKey(rec.authorKey);
  return createNodeComment({
    id: rec.id,
    nodeEntityRef: rec.nodeEntityRef,
    authorName: rec.authorName,
    authorClientId: rec.authorClientId,
    authorKey,
    body: rec.body,
    createdAtMs: rec.createdAtMs,
  })
    ? {
        id: rec.id,
        nodeEntityRef: rec.nodeEntityRef,
        authorName: rec.authorName,
        authorClientId: rec.authorClientId,
        ...(authorKey ? { authorKey } : {}),
        body: commentBodyAsText(rec.body),
        createdAtMs: rec.createdAtMs,
        status: rec.status as NodeCommentStatus,
      }
    : null;
}

export function commentsFromRecord(raw: Record<string, unknown>): NodeComment[] {
  const comments: NodeComment[] = [];
  for (const value of Object.values(raw)) {
    const parsed = parseNodeComment(value);
    if (parsed) comments.push(parsed);
  }
  return comments.sort((a, b) => a.createdAtMs - b.createdAtMs || a.id.localeCompare(b.id));
}
