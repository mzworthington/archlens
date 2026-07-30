import type { SystemSchema } from '../models/schema';
import { buildWorkspaceCatalog } from '../lib/workspaceCatalog';
import { resolveWorkspaceEntityRefs } from '../lib/entityRef';
import { validateGraph } from './graph';

export type BlueprintValidationIssueType =
  'schema-error' | 'cycle' | 'disconnected' | 'invalid-connection' | 'broken-entity-ref';

export type BlueprintValidationIssue = {
  file: string;
  type: BlueprintValidationIssueType;
  message: string;
  path?: string[];
};

export type BlueprintValidationResult = {
  isValid: boolean;
  issues: BlueprintValidationIssue[];
  filesChecked: number;
};

export type LoadedBlueprintSchema = {
  path: string;
  schema: SystemSchema;
};

/**
 * Validate a blueprint workspace: schema shape, dependency cycles,
 * invalid local connections, and broken entityRef hierarchy links.
 */
export function validateBlueprintWorkspace(
  files: LoadedBlueprintSchema[],
  workspaceName?: string | null
): BlueprintValidationResult {
  const issues: BlueprintValidationIssue[] = [];

  if (files.length === 0) {
    return { isValid: false, issues, filesChecked: 0 };
  }

  const resolved = resolveWorkspaceEntityRefs(files, workspaceName);
  const resolvedFiles = files.map(file => ({
    path: file.path,
    schema: resolved.schemas[file.path] ?? file.schema,
  }));

  const catalog = buildWorkspaceCatalog(resolvedFiles, workspaceName);
  const catalogByEntityRef = new Map(catalog.map(entry => [entry.entityRef, entry]));
  const knownNodeRefs = new Set<string>();
  for (const entry of catalog) {
    for (const nodeRef of entry.nodeEntityRefs) {
      knownNodeRefs.add(nodeRef);
    }
    knownNodeRefs.add(entry.entityRef);
  }

  for (const file of resolvedFiles) {
    const localNodeRefs = new Set(file.schema.nodes.map(node => node.entityRef));

    for (const node of file.schema.nodes) {
      if (!node.parentEntityRef) continue;
      if (!localNodeRefs.has(node.parentEntityRef)) {
        issues.push({
          file: file.path,
          type: 'broken-entity-ref',
          message: `Node "${node.entityRef}" parentEntityRef "${node.parentEntityRef}" does not exist on this diagram.`,
          path: [node.entityRef, node.parentEntityRef],
        });
      }
    }

    const graphResult = validateGraph(file.schema);
    for (const issue of graphResult.issues) {
      issues.push({
        file: file.path,
        type: issue.type,
        message: issue.message,
        path: issue.path,
      });
    }

    const schemaEntityRef = file.schema.entityRef;
    if (schemaEntityRef && file.schema.level !== 'context') {
      const parentEntry = catalogByEntityRef.get(schemaEntityRef)?.parentEntityRef;
      if (parentEntry) {
        const parentDiagram = catalog.find(entry => entry.entityRef === parentEntry);
        if (parentDiagram && !parentDiagram.nodeEntityRefs.includes(schemaEntityRef)) {
          issues.push({
            file: file.path,
            type: 'broken-entity-ref',
            message: `Diagram entityRef "${schemaEntityRef}" is not represented as a node on parent diagram "${parentDiagram.path}".`,
            path: [schemaEntityRef],
          });
        }
      }
    }

    for (const dep of file.schema.dependencies) {
      for (const endpoint of [dep.from, dep.to]) {
        if (!endpoint || localNodeRefs.has(endpoint)) continue;
        const targetNode = file.schema.nodes.find(node => node.entityRef === endpoint);
        if (targetNode?.external) continue;
        if (knownNodeRefs.has(endpoint)) continue;
        issues.push({
          file: file.path,
          type: 'broken-entity-ref',
          message: `Dependency endpoint "${endpoint}" is not a local node and is not known in the workspace.`,
          path: [dep.from, dep.to],
        });
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    filesChecked: files.length,
  };
}
