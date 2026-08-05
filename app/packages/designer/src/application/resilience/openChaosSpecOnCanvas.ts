import { resolveEntityHome, type WorkspaceCatalogEntry } from '@archlens/core';
import {
  parseChaosSpecFromYaml,
  resolveChaosSpecCatalogAvailability,
  type ChaosSpecDocument,
} from '@archlens/core/resilience';
import { buildChaosLensUrl } from './chaosLensUrl';

export type OpenChaosSpecOnCanvasActions = {
  workspaceCatalog: WorkspaceCatalogEntry[];
  setLocation: (path: string) => void;
  selectSystem: (path: string) => Promise<void>;
  applyChaosSpecYaml: (yaml: string) => string | null;
  runResilienceSimulation?: () => void;
};

export type OpenChaosSpecOnCanvasResult =
  { ok: true; document: ChaosSpecDocument } | { ok: false; reason: string };

export type OpenChaosSpecOnCanvasOptions = {
  /** When true, run simulation after a successful apply. */
  simulate?: boolean;
};

/**
 * Navigate to the ChaosSpec’s diagram in ChaosLens mode, load the scenario, optionally simulate.
 */
export async function openChaosSpecOnCanvas(
  yaml: string,
  actions: OpenChaosSpecOnCanvasActions,
  options: OpenChaosSpecOnCanvasOptions = {}
): Promise<OpenChaosSpecOnCanvasResult> {
  let document: ChaosSpecDocument;
  try {
    document = parseChaosSpecFromYaml(yaml);
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Invalid ChaosSpec YAML',
    };
  }

  const availability = resolveChaosSpecCatalogAvailability(
    document.metadata,
    actions.workspaceCatalog
  );
  if (availability === 'diagram-missing') {
    return {
      ok: false,
      reason: `Target diagram "${document.metadata.diagramRef}" is not in this workspace. Open the samples estate or a folder that includes that BlueprintSpec.`,
    };
  }

  const home = resolveEntityHome(actions.workspaceCatalog, document.metadata.diagramRef);
  if (!home) {
    return {
      ok: false,
      reason: `Target diagram "${document.metadata.diagramRef}" is not in this workspace.`,
    };
  }

  actions.setLocation(
    buildChaosLensUrl(document.metadata.diagramRef, {
      faults: document.faults,
    })
  );
  await actions.selectSystem(home.path);

  const applyError = actions.applyChaosSpecYaml(yaml);
  if (applyError) {
    return { ok: false, reason: applyError };
  }

  if (options.simulate) {
    actions.runResilienceSimulation?.();
  }

  return { ok: true, document };
}
