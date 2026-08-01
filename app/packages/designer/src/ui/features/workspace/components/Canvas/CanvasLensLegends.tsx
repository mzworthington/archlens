import React from 'react';
import { Panel } from '@xyflow/react';
import { ChaosLensLegend } from '../../../resilience/components/ChaosLensLegend';
import { CouplingLensLegend } from '../../../forensics/components/CouplingLensLegend';

type CanvasLensLegendsProps = {
  isResilienceMode: boolean;
  resilienceSimulationResult: unknown;
  liteCanvas: boolean;
  showCoupling: boolean;
  couplingFocusMode: boolean;
};

export const CanvasLensLegends: React.FC<CanvasLensLegendsProps> = ({
  isResilienceMode,
  resilienceSimulationResult,
  liteCanvas,
  showCoupling,
  couplingFocusMode,
}) => (
  <>
    {isResilienceMode && resilienceSimulationResult && !liteCanvas ? (
      <Panel position="top-right" className="!mt-14 !mr-4 pointer-events-none">
        <ChaosLensLegend />
      </Panel>
    ) : null}

    {showCoupling && !liteCanvas && !isResilienceMode ? (
      <Panel position="top-right" className="!mt-14 !mr-4 pointer-events-none">
        <CouplingLensLegend focusMode={couplingFocusMode} />
      </Panel>
    ) : null}
  </>
);
