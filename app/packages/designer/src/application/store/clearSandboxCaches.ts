import { clearAllStoredSchemas } from '../../infrastructure/db/db';
import { clearBlueprintSchemaCache } from './defaultData';
import { resetBundledBlueprintLoaderState } from './states/diagramState/bundledBlueprintLoader';
import { clearSessionLayout } from './sessionLayoutCache';

let sandboxSessionGeneration = 0;

/** Bumped on every sandbox reset so in-flight startup work can bail out. */
export function bumpSandboxSessionGeneration(): number {
  sandboxSessionGeneration += 1;
  return sandboxSessionGeneration;
}

export function getSandboxSessionGeneration(): number {
  return sandboxSessionGeneration;
}

/** Drop in-memory layout cache, bundled loader state, and IndexedDB working copies. */
export async function clearSandboxCaches(): Promise<void> {
  bumpSandboxSessionGeneration();
  clearSessionLayout();
  clearBlueprintSchemaCache();
  resetBundledBlueprintLoaderState();
  await clearAllStoredSchemas();
}
