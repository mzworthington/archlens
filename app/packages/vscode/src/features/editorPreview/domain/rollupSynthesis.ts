import { ModelExtractor } from '@archlens/analysis/model-extractor';
import type { ParsedSourceFile } from '@archlens/analysis/types';
import { buildRollupDrillDownSchemas } from '@archlens/analysis/writers';
import {
  parseSchemaFromYaml,
  slugify,
  systemSchemaPublicUrl,
  type SystemNode,
  type SystemSchema,
} from '@archlens/core';
import type { BlueprintFile, DiagramView } from '../ports';
import {
  diagramFrom,
  isContextFile,
  isInsideEditorPath,
  joinEditorPath,
  readableBlueprint,
  renderBlueprint,
  safeBlueprintsFolder,
  workspaceSlug,
} from './copyConstants';
import type { BlueprintDocument, NamedSystem } from './workspaceScan';

/** Files under the blueprints folder that make the review true. Other folders are left alone. */
export function blueprintWritePlan(input: {
  root: string;
  blueprintsFolder: string;
  files: readonly BlueprintFile[];
  scanned: readonly NamedSystem[];
  sourceFiles?: readonly string[];
  analyzed?: readonly BlueprintDocument[];
}): { documents: readonly BlueprintDocument[]; diagram: DiagramView } {
  const folderPath = joinEditorPath(input.root, safeBlueprintsFolder(input.blueprintsFolder));
  const parsed = input.files.flatMap(file => {
    if (!isInsideEditorPath(file.path, folderPath)) return [];
    try {
      return [
        {
          path: file.path,
          original: file.content,
          schema: parseSchemaFromYaml(readableBlueprint(file.content)),
        },
      ];
    } catch {
      return [];
    }
  });
  const targetPath =
    parsed.find(file => file.schema.level === 'context')?.path ??
    parsed.find(file => isContextFile(file.path))?.path ??
    joinEditorPath(folderPath, 'context.yaml');
  const documents: BlueprintDocument[] = [];
  let diagram: DiagramView | undefined;
  const rollupDocuments =
    input.analyzed ?? rollupBlueprintDocuments(input.root, folderPath, input.sourceFiles ?? []);
  const rollupPaths = new Set(rollupDocuments.map(document => document.path));

  for (const file of parsed) {
    if (input.sourceFiles && file.path !== targetPath) {
      if (!rollupPaths.has(file.path)) documents.push({ path: file.path });
      continue;
    }
    const next = editedSchema(file.schema, input.scanned, file.path === targetPath);
    if (next.nodes.length === 0) {
      documents.push({ path: file.path });
      continue;
    }
    if (file.path === targetPath) diagram = diagramFrom(file.path, next);
    if (sameShape(file.schema, next)) continue;
    documents.push({ path: file.path, content: renderBlueprint(next, file.original) });
  }

  if (!parsed.some(file => file.path === targetPath)) {
    const next = editedSchema(freshSchema(input.root), input.scanned, true);
    diagram = diagramFrom(targetPath, next);
    documents.push({ path: targetPath, content: renderBlueprint(next, undefined) });
  }

  for (const document of rollupDocuments) documents.push(document);

  return {
    documents,
    diagram: diagram ?? diagramFrom(targetPath, freshSchema(input.root)),
  };
}

/** Container, component and folder drill-down files, matching the CLI rollup writers. */
function rollupBlueprintDocuments(
  root: string,
  folderPath: string,
  files: readonly string[]
): BlueprintDocument[] {
  const parsed = files.flatMap(file => {
    const relative = relativeSourcePath(root, file);
    return relative ? [parsedSourceFile(relative)] : [];
  });
  if (parsed.length === 0) return [];

  const parentRef = workspaceSlug(root);
  const graph = new ModelExtractor(parentRef, { rollupModules: true }).extractGraph(parsed);
  const componentNodes = [...graph.componentNodesMap.values()];
  const fileNodes = [...graph.fileLevelNodesMap.values()];
  const documents: BlueprintDocument[] = [];
  const containerNodes = [...graph.containerNodesMap.values()].map(writableNode);

  if (containerNodes.length > 0) {
    documents.push(
      renderedDocument(joinEditorPath(folderPath, 'containers.yaml'), {
        entityRef: parentRef,
        name: `${parentRef} Containers`,
        version: systemSchemaPublicUrl(),
        level: 'container',
        nodes: containerNodes,
        dependencies: graph.containerDependencies,
      })
    );
  }

  for (const [containerId, containerNode] of graph.containerNodesMap) {
    const internal = componentNodes.filter(node => node.properties?.containerId === containerId);
    if (internal.length === 0 || !containerNode.entityRef) continue;
    const drillDowns = buildRollupDrillDownSchemas(
      containerNode.entityRef,
      internal,
      fileNodes,
      graph.fileLevelDependencies,
      undefined,
      componentNodes
    );
    documents.push(
      renderedDocument(joinEditorPath(folderPath, `${containerId}-components.yaml`), {
        entityRef: containerNode.entityRef,
        name: `${containerNode.name} Components`,
        version: systemSchemaPublicUrl(),
        level: 'component',
        nodes: internal.map(writableNode),
        dependencies: graph.componentDependencies.filter(
          dependency =>
            dependency.from.startsWith(`${containerNode.entityRef}/`) ||
            dependency.to.startsWith(`${containerNode.entityRef}/`)
        ),
      })
    );
    for (const drillDown of drillDowns) {
      documents.push(
        renderedDocument(joinEditorPath(folderPath, drillDown.relativePath), {
          ...drillDown.schema,
          version: systemSchemaPublicUrl(),
          nodes: drillDown.schema.nodes.map(writableNode),
        })
      );
    }
  }

  return documents;
}

function renderedDocument(path: string, schema: SystemSchema): BlueprintDocument {
  return { path, content: renderBlueprint(schema, undefined) };
}

function writableNode(node: SystemNode): SystemNode {
  if (!node.properties) return node;
  const properties: NonNullable<SystemNode['properties']> = {};
  for (const [key, value] of Object.entries(node.properties)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      properties[key] = value;
    }
  }
  return {
    ...node,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
  };
}

function parsedSourceFile(relativePath: string): ParsedSourceFile {
  const baseName =
    relativePath
      .split('/')
      .pop()
      ?.replace(/\.[^.]+$/, '') || relativePath;
  return {
    filePath: relativePath,
    relativePath,
    baseName,
    isTestFile: /\.(test|spec)\.[^.]+$/.test(relativePath),
    imports: [],
    reExports: [],
    newExpressions: [],
    callExpressions: [],
  };
}

function relativeSourcePath(root: string, file: string): string {
  const normalizedRoot = root.replaceAll('\\', '/').replace(/\/+$/, '');
  const normalized = file.replaceAll('\\', '/');
  if (normalized.startsWith(`${normalizedRoot}/`)) {
    return normalized.slice(normalizedRoot.length + 1);
  }
  return normalized.split('/').pop() || normalized;
}

function freshSchema(root: string): SystemSchema {
  const folder =
    root
      .replace(/[/\\]+$/, '')
      .split(/[/\\]/)
      .pop() || 'workspace';
  return {
    name: folder,
    entityRef: slugify(folder) || 'workspace',
    version: systemSchemaPublicUrl(),
    level: 'context',
    nodes: [],
    dependencies: [],
  };
}

function editedSchema(
  schema: SystemSchema,
  scanned: readonly NamedSystem[],
  acceptNew: boolean
): SystemSchema {
  const byRef = new Map(scanned.map(system => [system.entityRef, system]));
  const nodes = schema.nodes.flatMap(node => {
    const next = byRef.get(node.entityRef);
    if (!next) return [];
    return [{ ...node, name: next.name }];
  });
  if (acceptNew) {
    const present = new Set(nodes.map(node => node.entityRef));
    for (const system of scanned) {
      if (present.has(system.entityRef)) continue;
      nodes.push({
        entityRef: system.entityRef,
        type: 'software-system',
        name: system.name,
        ...(system.sourceFile ? { properties: { filepath: system.sourceFile } } : {}),
      });
    }
  }
  const present = new Set(nodes.map(node => node.entityRef));
  return {
    ...schema,
    nodes,
    dependencies: schema.dependencies.filter(
      dependency => present.has(dependency.from) && present.has(dependency.to)
    ),
  };
}

function sameShape(before: SystemSchema, after: SystemSchema): boolean {
  if (before.nodes.length !== after.nodes.length) return false;
  if (before.dependencies.length !== after.dependencies.length) return false;
  const nodesMatch = before.nodes.every(
    (node, index) =>
      node.entityRef === after.nodes[index]?.entityRef && node.name === after.nodes[index]?.name
  );
  const linksMatch = before.dependencies.every(
    (dependency, index) =>
      dependency.from === after.dependencies[index]?.from &&
      dependency.to === after.dependencies[index]?.to
  );
  return nodesMatch && linksMatch;
}
