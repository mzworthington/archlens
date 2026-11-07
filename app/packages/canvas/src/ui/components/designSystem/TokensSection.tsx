import React from 'react';
import { Copy, Check, Palette } from 'lucide-react';
import type { DesignThemeId } from '../../../infrastructure/theme/designTheme';
import { DESIGN_THEME_TOKENS } from '../../theme/designTokens';
import {
  NODE_STATUS_MARKERS,
  NODE_STATUS_TOKENS,
  PRODUCT_CATEGORY_STYLES,
  PRODUCT_CATEGORY_TOKENS,
} from './shared';

type TokensSectionProps = {
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  theme?: DesignThemeId;
};

const SWATCHES: {
  id: 'canvas' | 'surface' | 'ink' | 'accent';
  label: string;
  token: string;
  fill: string;
}[] = [
  {
    id: 'canvas',
    label: 'Canvas',
    token: '--color-canvas',
    fill: 'bg-canvas border border-ink/10',
  },
  {
    id: 'surface',
    label: 'Surface',
    token: '--color-surface',
    fill: 'bg-surface border border-ink/15',
  },
  { id: 'ink', label: 'Ink', token: '--color-ink', fill: 'bg-ink' },
  { id: 'accent', label: 'Accent', token: '--color-accent', fill: 'bg-accent' },
];

export const TokensSection: React.FC<TokensSectionProps> = ({
  copiedId,
  copyToClipboard,
  theme = 'blueprint',
}) => {
  const tokens = DESIGN_THEME_TOKENS[theme];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-accent/10 pb-4">
        <h2 className="text-xl font-bold text-ink tracking-tight flex items-center gap-2">
          <Palette className="w-5 h-5 text-accent" /> Design tokens
        </h2>
        <p className="text-xs text-ink/60 mt-1">
          Semantic colors shared by the homepage, docs and canvas. Hex values follow the selected
          design.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink/55 font-mono">
          Color palette
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SWATCHES.map(swatch => {
            const hex = tokens[swatch.id];
            return (
              <div
                key={swatch.id}
                className="border border-ink/10 bg-surface rounded-xl p-3 flex flex-col space-y-3"
              >
                <div className={`h-16 w-full rounded-lg ${swatch.fill}`} />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-ink">{swatch.label}</div>
                    <div className="text-[10px] text-ink/55 font-mono mt-0.5">{swatch.token}</div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-ink/70 border-t border-ink/10 mt-2 pt-2">
                    <span>{hex}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(hex, swatch.id)}
                      className="text-accent hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {copiedId === swatch.id ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedId === swatch.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink/55 font-mono">
          Product category accents
        </h3>
        <p className="text-xs text-ink/60">
          Used on the homepage and docs for Platform, Intelligence, Resilience and Contract badges.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(
            Object.entries(PRODUCT_CATEGORY_STYLES) as [
              keyof typeof PRODUCT_CATEGORY_STYLES,
              string,
            ][]
          ).map(([label, className]) => (
            <div
              key={label}
              className="border border-ink/10 bg-surface rounded-xl p-3 flex flex-col gap-3"
            >
              <span
                className={`self-start rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${className}`}
              >
                {label}
              </span>
              <p className="text-[10px] text-ink/55 font-mono break-all">
                {PRODUCT_CATEGORY_TOKENS[label]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink/55 font-mono">
          Node status
        </h3>
        <p className="text-xs text-ink/60">Healthy, warning and error markers on a node.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.keys(NODE_STATUS_TOKENS) as (keyof typeof NODE_STATUS_TOKENS)[]).map(status => (
            <div
              key={status}
              className="border border-ink/10 bg-surface rounded-xl p-3 flex items-center justify-between gap-3"
            >
              <div>
                <div className="text-xs font-bold text-ink capitalize">{status}</div>
                <div className="text-[10px] text-ink/55 font-mono mt-0.5">
                  {NODE_STATUS_TOKENS[status]}
                </div>
              </div>
              <span className={`h-3 w-3 rounded-full ${NODE_STATUS_MARKERS[status]}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink/55 font-mono">
          Typography scale
        </h3>
        <div className="border border-ink/10 rounded-xl p-4 bg-surface divide-y divide-ink/10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-2">
            <div>
              <div className="text-xs font-semibold text-ink/55 font-mono">UI title / heading</div>
              <div className="text-lg font-extrabold text-ink mt-1 font-sans">
                Plus Jakarta Sans - Bold
              </div>
            </div>
            <div className="text-xs font-mono text-ink/55 text-right">
              font-family: var(--font-sans)
              <br />
              letter-spacing: -0.02em
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-2">
            <div>
              <div className="text-xs font-semibold text-ink/55 font-mono">
                Code / node identifiers
              </div>
              <div className="text-sm font-semibold text-accent mt-1 font-mono">
                JetBrains Mono - Medium
              </div>
            </div>
            <div className="text-xs font-mono text-ink/55 text-right">
              font-family: var(--font-mono)
              <br />
              font-weight: 500
            </div>
          </div>

          <div className="pt-4 space-y-3 font-sans">
            <div className="flex items-baseline gap-4">
              <span className="text-2xl font-extrabold text-ink">Aa</span>
              <span className="text-xs font-mono text-accent">
                H1: 1.5rem (24px) / font-extrabold
              </span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-xl font-bold text-ink">Aa</span>
              <span className="text-xs font-mono text-accent">H2: 1.25rem (20px) / font-bold</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-sm font-medium text-ink/80">Aa</span>
              <span className="text-xs font-mono text-accent">
                Body: 0.875rem (14px) / font-normal
              </span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-xs font-normal text-ink/55">Aa</span>
              <span className="text-xs font-mono text-accent">Small: 0.75rem (12px) / ink 55%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
