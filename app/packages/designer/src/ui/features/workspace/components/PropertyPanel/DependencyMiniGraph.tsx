import React, { useMemo } from 'react';
import type { DependencyGraphPeer } from '../../../../../application/forensics/filterSelectedDependencyFocus';

export interface DependencyMiniGraphProps {
  centerLabel: string;
  upstream: DependencyGraphPeer[];
  downstream: DependencyGraphPeer[];
  upstreamTotal: number;
  downstreamTotal: number;
  onPeerClick?: (entityRef: string) => void;
}

const WIDTH = 220;
const HEIGHT = 140;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const PEER_RADIUS = 52;
const NODE_R = 9;

function truncate(label: string, max = 10): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function layoutPeers(
  peers: DependencyGraphPeer[],
  side: 'left' | 'right'
): Array<{ peer: DependencyGraphPeer; x: number; y: number }> {
  if (peers.length === 0) return [];
  const startAngle = side === 'left' ? (Math.PI * 2) / 3 : Math.PI / 3;
  const endAngle = side === 'left' ? (Math.PI * 4) / 3 : (Math.PI * 2) / 3;
  const span = endAngle - startAngle;

  return peers.map((peer, index) => {
    const angle =
      peers.length === 1
        ? side === 'left'
          ? Math.PI
          : 0
        : startAngle + (span * index) / (peers.length - 1);
    return {
      peer,
      x: CENTER_X + PEER_RADIUS * Math.cos(angle),
      y: CENTER_Y + PEER_RADIUS * Math.sin(angle),
    };
  });
}

/**
 * Radial mini-graph of schema dependency peers (display-only).
 */
export const DependencyMiniGraph: React.FC<DependencyMiniGraphProps> = ({
  centerLabel,
  upstream,
  downstream,
  upstreamTotal,
  downstreamTotal,
  onPeerClick,
}) => {
  const upstreamLayout = useMemo(() => layoutPeers(upstream, 'left'), [upstream]);
  const downstreamLayout = useMemo(() => layoutPeers(downstream, 'right'), [downstream]);

  if (upstream.length === 0 && downstream.length === 0) return null;

  const upstreamOverflow = upstreamTotal - upstream.length;
  const downstreamOverflow = downstreamTotal - downstream.length;

  const renderPeer = (
    { peer, x, y }: { peer: DependencyGraphPeer; x: number; y: number },
    stroke: string,
    fill: string
  ) => {
    const clickable = Boolean(onPeerClick);
    return (
      <g
        key={peer.entityRef}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        className={clickable ? 'cursor-pointer' : undefined}
        data-testid={`dependency-peer-${peer.entityRef}`}
        onClick={
          clickable
            ? event => {
                event.stopPropagation();
                onPeerClick?.(peer.entityRef);
              }
            : undefined
        }
        onKeyDown={
          clickable
            ? event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onPeerClick?.(peer.entityRef);
                }
              }
            : undefined
        }
      >
        <line
          x1={CENTER_X}
          y1={CENTER_Y}
          x2={x}
          y2={y}
          stroke={stroke}
          strokeWidth={Math.max(1, 2.5 - peer.hop * 0.5)}
          opacity={0.55}
        />
        <circle cx={x} cy={y} r={NODE_R} fill={fill} stroke={stroke} />
        <title>
          {peer.name} ({peer.hop} hop{peer.hop === 1 ? '' : 's'})
        </title>
        <text
          x={x}
          y={y + NODE_R + 7}
          textAnchor="middle"
          className="fill-slate-400"
          fontSize="6"
          fontFamily="ui-monospace, monospace"
        >
          {truncate(peer.name, 11)}
        </text>
      </g>
    );
  };

  return (
    <div
      className="rounded-xl border border-slate-900 bg-slate-950/40 p-2"
      data-testid="dependency-mini-graph"
    >
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto block"
      >
        {upstreamLayout.map(item => renderPeer(item, 'rgb(167 139 250)', 'rgb(76 29 149 / 0.35)'))}
        {downstreamLayout.map(item => renderPeer(item, 'rgb(52 211 153)', 'rgb(6 78 59 / 0.35)'))}
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={NODE_R + 2}
          fill="rgb(15 23 42)"
          stroke="rgb(0 240 255)"
        />
        <text
          x={CENTER_X}
          y={CENTER_Y + 3}
          textAnchor="middle"
          className="fill-slate-200"
          fontSize="7"
          fontFamily="ui-monospace, monospace"
        >
          {truncate(centerLabel, 12)}
        </text>
      </svg>
      {(upstreamOverflow > 0 || downstreamOverflow > 0) && (
        <p className="mt-1 text-center text-[10px] font-mono text-slate-500">
          {upstreamOverflow > 0 ? `+${upstreamOverflow} upstream` : null}
          {upstreamOverflow > 0 && downstreamOverflow > 0 ? ' · ' : null}
          {downstreamOverflow > 0 ? `+${downstreamOverflow} downstream` : null}
        </p>
      )}
    </div>
  );
};
