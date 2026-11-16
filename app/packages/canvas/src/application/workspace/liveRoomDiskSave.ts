import {
  collabDocumentIsBootPlaceholder,
  schemaToCollabDocument,
  type C4Level,
  type SystemSchema,
} from '@archlens/core';
import type { ApplyStateGet } from '../store/states/diagramState/applyStateUpdates';
import { commitDiagramFile } from './commitDiagramFile';

export const LIVE_ROOM_DISK_SAVE_DEBOUNCE_MS = 800;

type PendingSave = {
  timer: ReturnType<typeof setTimeout>;
  path: string;
  yaml: string;
  schema: SystemSchema;
  nodeRefMap: Record<string, string>;
};

const pendingSaves = new Map<string, PendingSave>();

function readDiagramSchema(
  schema: NonNullable<ReturnType<ApplyStateGet>['schema']>
): SystemSchema | null {
  if (!schema.version || !schema.level || !schema.nodes || !schema.dependencies) return null;
  const level: C4Level = schema.level;
  const next: SystemSchema = {
    name: schema.name,
    version: schema.version,
    level,
    nodes: schema.nodes,
    dependencies: schema.dependencies,
  };
  if (schema.entityRef !== undefined) next.entityRef = schema.entityRef;
  if (schema.source !== undefined) next.source = schema.source;
  return next;
}

function folderWorkspaceOpen(state: ReturnType<ApplyStateGet>): boolean {
  return Boolean(
    state.isWorkspaceOpen &&
    !state.isSampleWorkspace &&
    !state.isMemoryScanWorkspace &&
    state.workspacePort &&
    state.workingCopyPort?.saveBaselineSchema
  );
}

export function scheduleQuietLiveRoomDiskSave(get: ApplyStateGet): void {
  const state = get();
  if (!state.collabSessionPort?.isActive() || !folderWorkspaceOpen(state)) return;
  const path = state.currentFilePath;
  const schema = state.schema ? readDiagramSchema(state.schema) : null;
  const yaml = state.yamlCode;
  if (!path || !schema || !yaml) return;
  if (collabDocumentIsBootPlaceholder(schemaToCollabDocument(schema))) return;

  const existing = pendingSaves.get(path);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    const job = pendingSaves.get(path);
    if (!job || job.timer !== timer) return;
    pendingSaves.delete(path);
    void commitPending(get, job);
  }, LIVE_ROOM_DISK_SAVE_DEBOUNCE_MS);
  pendingSaves.set(path, {
    timer,
    path,
    yaml,
    schema,
    nodeRefMap: state.nodeRefMap?.[path] ?? {},
  });
}

export function cancelQuietLiveRoomDiskSave(path: string): void {
  const job = pendingSaves.get(path);
  if (!job) return;
  clearTimeout(job.timer);
  pendingSaves.delete(path);
}

export function flushQuietLiveRoomDiskSaves(get: ApplyStateGet): void {
  const jobs = [...pendingSaves.values()];
  pendingSaves.clear();
  for (const job of jobs) clearTimeout(job.timer);
  for (const job of jobs) {
    void commitPending(get, job);
  }
}

async function commitPending(get: ApplyStateGet, job: PendingSave): Promise<void> {
  const state = get();
  const saveBaselineSchema = state.workingCopyPort?.saveBaselineSchema;
  if (!folderWorkspaceOpen(state) || !state.workspacePort || !saveBaselineSchema) return;
  const info = state.logger?.info;
  const error = state.logger?.error;
  if (!info || !error) return;
  await commitDiagramFile(
    {
      workspacePort: state.workspacePort,
      workingCopyPort: { saveBaselineSchema },
      logger: { info, error },
      setNotification: state.setNotification,
      checkPendingChanges: state.checkPendingChanges,
    },
    {
      path: job.path,
      yaml: job.yaml,
      schema: job.schema,
      nodeRefMap: job.nodeRefMap,
      quiet: true,
    }
  );
}
