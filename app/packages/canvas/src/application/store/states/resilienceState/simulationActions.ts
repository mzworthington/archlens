import type { EntityRef } from '@archlens/core';
import { buildSimulationSchemaForFaults, type SimulationResult } from '@archlens/core/resilience';
import { runResilienceSimulationAsync } from '../../../resilience/runResilienceSimulationAsync';
import { syncResilienceExternalsToCanvas } from '../../../resilience/syncResilienceExternals';
import type { ResilienceGet, ResilienceSet } from './types';
import { resilienceModePanelPatch } from './helpers';

export function createSimulationActions(set: ResilienceSet, get: ResilienceGet) {
  return {
    runResilienceSimulation: () => {
      const {
        schema,
        loadedSystems,
        resilienceFaults,
        resilienceSafeguards,
        resilienceMonteCarlo,
        logger,
        resilienceEnginePort,
        addExternalDependencies,
      } = get();

      if (resilienceFaults.length === 0) return;

      const faultTargets = resilienceFaults.map(fault => fault.nodeId);
      const simulationSpec = {
        faults: resilienceFaults,
        safeguards: resilienceSafeguards,
      };

      const {
        schema: simulationSchema,
        scope,
        materialized,
      } = buildSimulationSchemaForFaults(schema, faultTargets, loadedSystems);

      if (materialized.length > 0) {
        addExternalDependencies(
          materialized.map(entity => entity.entityRef),
          simulationSchema.dependencies
        );
      } else if ((simulationSchema.dependencies?.length ?? 0) > 0) {
        // Externals may already be on the canvas from entering resilience mode;
        // still wire any enriched simulation dependency lines that are missing.
        addExternalDependencies([], simulationSchema.dependencies);
      }

      set({ resilienceSimulationRunning: true, resilienceSimulationScope: scope });
      void runResilienceSimulationAsync(simulationSchema, simulationSpec, {
        monteCarlo: resilienceMonteCarlo,
        logger,
        engine: resilienceEnginePort,
      })
        .then((result: SimulationResult) => {
          set({
            resilienceSimulationResult: result,
            resilienceSimulationRunning: false,
          });
        })
        .catch(err => {
          logger.error('ChaosLens resilience simulation failed.', err);
          set({ resilienceSimulationRunning: false });
        });
    },
    simulateResilienceFaultAtNode: (nodeId: EntityRef) => {
      set({
        selectedNodeId: nodeId,
        isResilienceMode: true,
        ...resilienceModePanelPatch(),
        resilienceFaults: [{ nodeId, faultType: 'region-outage', severity: 1 }],
        resilienceFaultType: 'region-outage',
        resilienceSeverity: 1,
        resilienceSimulationResult: null,
        resilienceSimulationScope: null,
        chaosSpecMetadata: null,
      });
      void syncResilienceExternalsToCanvas(get, set);
      get().runResilienceSimulation();
    },
    clearResilienceSimulation: () =>
      set({ resilienceSimulationResult: null, resilienceSimulationScope: null }),
  };
}
