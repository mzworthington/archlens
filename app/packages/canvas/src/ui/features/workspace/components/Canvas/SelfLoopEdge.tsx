import { BaseEdge, type EdgeProps } from '@xyflow/react';
import { selfLoopEdgePath } from '../../../../../application/store/layout/selfLoopEdge';

/** Draws a dependency from a node back to itself as a loop beside the card. */
export function SelfLoopEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  markerEnd,
  markerStart,
  style,
  interactionWidth,
}: EdgeProps) {
  const { path, labelX, labelY } = selfLoopEdgePath({ sourceX, sourceY, targetX, targetY });
  return (
    <BaseEdge
      id={id}
      path={path}
      labelX={labelX}
      labelY={labelY}
      label={label}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      markerEnd={markerEnd}
      markerStart={markerStart}
      style={style}
      interactionWidth={interactionWidth}
    />
  );
}
