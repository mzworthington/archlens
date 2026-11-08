import {
  commentSidecarPath,
  createNodeComment,
  deleteComment,
  emptyCommentDocument,
  mergeCommentDocuments,
  parseCommentDocument,
  resolveComment,
  serializeCommentDocument,
  type CollabCommentDocument,
  type NodeComment,
} from '@archlens/core';
import type { WorkspacePort } from '../../../../core';
import { getCollabPrefillDisplayName } from '../../../collab/collabDisplayName';

// ---------------------------------------------------------------------------
// Sidecar I/O via WorkspacePort
// ---------------------------------------------------------------------------

export async function loadCommentSidecar(
  diagramPath: string,
  workspacePort: WorkspacePort
): Promise<CollabCommentDocument> {
  const sidecarPath = commentSidecarPath(diagramPath);
  try {
    const raw = await workspacePort.readFile(sidecarPath);
    if (!raw.trim()) return emptyCommentDocument();
    return parseCommentDocument(raw);
  } catch {
    return emptyCommentDocument();
  }
}

export async function flushCommentSidecar(
  diagramPath: string,
  doc: CollabCommentDocument,
  workspacePort: WorkspacePort,
  logger: { error: (msg: string, err?: unknown) => void }
): Promise<void> {
  const sidecarPath = commentSidecarPath(diagramPath);
  const yaml = serializeCommentDocument(doc);
  try {
    await workspacePort.writeFile(sidecarPath, yaml);
  } catch (err) {
    logger.error('Failed to flush comment sidecar', err);
  }
}

// ---------------------------------------------------------------------------
// Local author identity for standalone (non-room) comment mutations
// ---------------------------------------------------------------------------

export type StandaloneAuthor = {
  name: string;
  clientId: 0;
  key: string;
};

export function resolveStandaloneAuthor(authorKey: string | null): StandaloneAuthor | null {
  if (!authorKey) return null;
  const name = getCollabPrefillDisplayName() || 'Anonymous';
  return { name, clientId: 0, key: authorKey };
}

// ---------------------------------------------------------------------------
// Pure document mutations (standalone path)
// ---------------------------------------------------------------------------

export function standaloneAddComment(
  doc: CollabCommentDocument,
  input: { nodeEntityRef: string; body: string },
  author: StandaloneAuthor
): { doc: CollabCommentDocument; comment: NodeComment | null } {
  const comment = createNodeComment({
    id: crypto.randomUUID(),
    nodeEntityRef: input.nodeEntityRef,
    authorName: author.name,
    authorClientId: author.clientId,
    authorKey: author.key,
    body: input.body,
    createdAtMs: Date.now(),
  });
  if (!comment) return { doc, comment: null };
  return { doc: { comments: { ...doc.comments, [comment.id]: comment } }, comment };
}

export function standaloneResolveComment(
  doc: CollabCommentDocument,
  id: string,
  author: StandaloneAuthor
): CollabCommentDocument {
  const existing = doc.comments[id];
  if (!existing) return doc;
  const mine = existing.authorKey
    ? existing.authorKey === author.key
    : existing.authorClientId === author.clientId;
  if (!mine) return doc;
  return resolveComment(doc, id);
}

export function standaloneDeleteComment(
  doc: CollabCommentDocument,
  id: string,
  author: StandaloneAuthor
): CollabCommentDocument {
  const existing = doc.comments[id];
  if (!existing) return doc;
  const mine = existing.authorKey
    ? existing.authorKey === author.key
    : existing.authorClientId === author.clientId;
  if (!mine) return doc;
  return deleteComment(doc, id);
}

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

export { mergeCommentDocuments };
