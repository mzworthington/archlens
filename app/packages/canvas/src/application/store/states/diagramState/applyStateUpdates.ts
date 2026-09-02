import {
  validateGraph,
  serializeSchemaToYaml,
  systemSchemaPublicUrl,
  type SystemSchema,
  type C4Level,
  type SourceProvenance,
  type ValidationResult,
  resolveWorkspaceEntityRefs,
  slugify,
} from '@archlens/core';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../layoutUtils';
import {
  attachClosestHandles,
  resolveWorkspaceName,
  mapSchemaToFqns,
  highlightEdgesForValidation,
  resolveCanvasNodeEntityRefs,
  buildNextSchemaFromCanvas,
} from './applyStateHelpers';
import { sortNodesForReactFlow } from '../../layoutUtils';
import { setSessionLayout, schemaLayoutFingerprint } from '../../sessionLayoutCache';
import type { BlueprintStoreSet } from '../../store';
import type { CollabSessionPort, LoggerPort, WorkingCopyPort } from '../../../../core';

export type ApplyStateSnapshot = {
  schema?: Pick<SystemSchema, 'name'> & Partial<SystemSchema>;
  loadedSystems?: Array<{ path: string; name: string; schema: SystemSchema }>;
  currentFilePath?: string;
  layoutCustomized?: boolean;
  validationResult?: ValidationResult;
  logger?: Partial<LoggerPort>;
  workingCopyPort?: Pick<WorkingCopyPort, 'saveWorkingSchema'> | null;
  checkPendingChanges?: () => void | Promise<void>;
  collabSessionPort?: Pick<CollabSessionPort, 'isActive' | 'pushSchema'> | null;
  workspaceName?: string;
  isWorkspaceOpen?: boolean;
};

export type ApplyStateGet = () => ApplyStateSnapshot;

export type ApplyStateUpdateOptions = {
  /** When false, skip IndexedDB working-copy sync (e.g. autolayout without persisting coords). */
  syncWorkingCopy?: boolean;
  /** When false, do not update the in-memory session layout cache. */
  updateSessionLayout?: boolean;
  /** When false, do not push the rebuilt schema into an active collab session (loads / remote applies). */
  pushCollab?: boolean;
  /** Contract version to persist (schema URL). Defaults to the current store schema. */
  version?: string;
};

function validationIssueSignature(result: ValidationResult): string {
  return result.issues.map(i => `${i.type}\0${i.message}\0${(i.path ?? []).join('\0')}`).join('\n');
}

/**
 * Rebuild schema from canvas nodes/edges, resolve entityRefs across the
 * workspace, validate, refresh YAML, and persist the working copy.
 */
export function applyStateUpdates(
  set: BlueprintStoreSet,
  get: ApplyStateGet,
  nextNodes: BlueprintRFNode[],
  nextEdges: BlueprintRFEdge[],
  customSchemaName?: string,
  customSchemaLevel?: C4Level,
  customEntityRef?: string | null,
  preservedSource?: SourceProvenance,
  options: ApplyStateUpdateOptions = {}
) {
  const syncWorkingCopy = options.syncWorkingCopy !== false;
  const updateSessionLayout = options.updateSessionLayout !== false;
  const currentSchema = get().schema ?? {
    name: 'Untitled',
    version: systemSchemaPublicUrl(),
    level: 'container' as C4Level,
    nodes: [],
    dependencies: [],
  };
  const name = customSchemaName ?? currentSchema.name;
  const version = options.version ?? currentSchema.version ?? systemSchemaPublicUrl();
  const level = customSchemaLevel ?? currentSchema.level ?? 'container';
  const entityRef =
    customEntityRef !== undefined
      ? customEntityRef === null
        ? undefined
        : customEntityRef
      : currentSchema.entityRef;

  const orderedNodes = sortNodesForReactFlow(nextNodes);
  const edgesWithHandles = attachClosestHandles(orderedNodes, nextEdges);
  const source = preservedSource !== undefined ? preservedSource : currentSchema.source;
  const nextSchema = buildNextSchemaFromCanvas(
    name,
    version,
    level,
    orderedNodes,
    edgesWithHandles,
    entityRef,
    source,
    get().layoutCustomized === true
  );

  const nextLoadedSystems =
    get().loadedSystems?.map((sys: { path: string; name: string; schema: SystemSchema }) => {
      if (sys.path === get().currentFilePath) {
        return { ...sys, name: nextSchema.name, schema: nextSchema };
      }
      return sys;
    }) || [];

  const workspaceName = resolveWorkspaceName(
    () => ({
      workspaceName: get().workspaceName ?? '',
      isWorkspaceOpen: get().isWorkspaceOpen === true,
      schema: {
        name: currentSchema.name,
        version,
        level,
        nodes: currentSchema.nodes ?? [],
        dependencies: currentSchema.dependencies ?? [],
        entityRef: currentSchema.entityRef,
        source: currentSchema.source,
      },
    }),
    name,
    level
  );

  const resolved = resolveWorkspaceEntityRefs(nextLoadedSystems, workspaceName);
  const currentFilePath = get().currentFilePath ?? '';
  const fileRefMap = resolved.nodeRefMap[currentFilePath] || {};
  const activeResolvedSchema = resolved.schemas[currentFilePath];
  const systemId =
    activeResolvedSchema?.entityRef || slugify(workspaceName || '').replace(/_/g, '-') || 'default';

  const nextSchemaMapped = mapSchemaToFqns(nextSchema, fileRefMap, systemId);
  const validationResult = validateGraph(nextSchemaMapped);
  const yamlCode = serializeSchemaToYaml(nextSchemaMapped);

  const prevValidation = get().validationResult;
  const validationChanged =
    validationIssueSignature(validationResult) !==
    validationIssueSignature(prevValidation ?? { isValid: true, issues: [] });

  if (!validationResult.isValid && validationChanged) {
    get().logger?.warn?.('Schema validation warnings triggered', {
      issues: validationResult.issues.map(
        (i: { type: string; message: string; path?: string[] }) => ({
          type: i.type,
          message: i.message,
          path: i.path,
        })
      ),
    });
  }

  const highlightedEdges = highlightEdgesForValidation(
    edgesWithHandles,
    validationResult,
    fileRefMap,
    systemId
  );
  const resolvedNextNodes = sortNodesForReactFlow(
    resolveCanvasNodeEntityRefs(orderedNodes, fileRefMap, systemId)
  );

  const resolvedSchema = resolved.schemas[currentFilePath]
    ? resolved.schemas[currentFilePath]
    : nextSchemaMapped;

  set({
    workspaceName,
    nodes: resolvedNextNodes,
    edges: highlightedEdges,
    schema: resolvedSchema,
    validationResult,
    yamlCode,
    loadedSystems: nextLoadedSystems.map(
      (sys: { path: string; name: string; schema: SystemSchema }) => ({
        ...sys,
        schema: resolved.schemas[sys.path] || sys.schema,
      })
    ),
    nodeRefMap: resolved.nodeRefMap,
  });

  if (updateSessionLayout && currentFilePath && resolvedNextNodes.length > 0) {
    setSessionLayout(
      currentFilePath,
      schemaLayoutFingerprint(resolvedSchema),
      resolvedNextNodes,
      highlightedEdges
    );
  }

  const workingCopy = get().workingCopyPort;
  if (workingCopy && syncWorkingCopy) {
    workingCopy
      .saveWorkingSchema({
        filePath: currentFilePath,
        schema: resolvedSchema,
        systemId,
        nodeRefMap: fileRefMap,
      })
      .then(() => {
        get().checkPendingChanges?.();
      })
      .catch((err: unknown) => {
        get().logger?.error?.('Failed to sync working schema to IndexedDB', err);
      });
  }

  const pushCollab = options.pushCollab !== false;
  const collab = get().collabSessionPort;
  if (pushCollab && collab?.isActive()) {
    collab.pushSchema(resolvedSchema);
  }
}
