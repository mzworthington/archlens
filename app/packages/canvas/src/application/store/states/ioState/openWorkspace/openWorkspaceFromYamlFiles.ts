import {
  parseSchemaFromYaml,
  resolveWorkspaceEntityRefs,
  buildWorkspaceCatalog,
} from '@archlens/core';
import { beginWorkspaceOpen, markFolderWorkspacePreferred } from '../../../workspaceOpenSession';
import { finalizeWorkspaceOpen } from './openWorkspaceFinalize';
import type { LoadWorkspaceFromYamlFilesDeps } from './openWorkspaceTypes';

export async function loadWorkspaceFromYamlFiles(
  deps: LoadWorkspaceFromYamlFilesDeps
): Promise<boolean> {
  const {
    logger,
    setNotification,
    initSchema,
    set,
    isSampleWorkspace = false,
    isBrowserLiteWorkspace = false,
    committedPorts,
    preferredEntryPath,
  } = deps;

  const openGeneration = deps.openGeneration ?? beginWorkspaceOpen();
  if (!isSampleWorkspace) {
    markFolderWorkspacePreferred();
  }

  if (deps.files.length === 0) {
    throw new Error('No blueprint .yaml or .yml files provided');
  }

  const schemaFiles = deps.files.filter(f => f.name.endsWith('.yaml') || f.name.endsWith('.yml'));

  const nextLoadedSystems = schemaFiles
    .map(file => {
      try {
        const schema = parseSchemaFromYaml(file.content);
        return {
          path: file.name,
          name:
            schema.name ||
            file.name
              .split('/')
              .pop()!
              .replace(/\.ya?ml$/, ''),
          schema,
        };
      } catch (err) {
        logger.warn(`Skipping file ${file.name} as it is not a valid blueprint schema: ${err}`);
        return null;
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  if (nextLoadedSystems.length === 0) {
    throw new Error('No valid blueprint schemas found');
  }

  const workspaceName = deps.workspaceName;
  const resolved = resolveWorkspaceEntityRefs(nextLoadedSystems, workspaceName);
  const resolvedSystems = nextLoadedSystems.map(sys => ({
    ...sys,
    schema: resolved.schemas[sys.path] || sys.schema,
  }));

  const workspaceCatalog = buildWorkspaceCatalog(
    resolvedSystems.map(s => ({ path: s.path, schema: s.schema })),
    workspaceName
  );

  const preferred =
    preferredEntryPath != null
      ? resolvedSystems.find(s => s.path === preferredEntryPath)
      : undefined;

  const firstSystem =
    preferred ||
    (isSampleWorkspace &&
      (resolvedSystems.find(s => s.path === 'golden-journey/context.yaml') ||
        resolvedSystems.find(s => s.path === 'golden-journey/containers.yaml'))) ||
    resolvedSystems.find(s => s.schema.level === 'context') ||
    resolvedSystems.find(s => s.schema.level === 'container') ||
    resolvedSystems[0];

  return finalizeWorkspaceOpen({
    entryCandidate: firstSystem,
    resolved,
    workspaceCatalog,
    workspaceName,
    isSampleWorkspace,
    isBrowserLiteWorkspace,
    openGeneration,
    committedPorts,
    workingCopy: deps.workingCopy,
    logger,
    setNotification,
    initSchema,
    set,
  });
}
