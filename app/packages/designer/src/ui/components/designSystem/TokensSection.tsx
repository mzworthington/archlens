import React from 'react';
import { Copy, Check, Palette } from 'lucide-react';
import { PRODUCT_CATEGORY_STYLES } from './shared';

type TokensSectionProps = {
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
};

export const TokensSection: React.FC<TokensSectionProps> = ({ copiedId, copyToClipboard }) => (
  <div className="space-y-8 animate-fade-in">
    <div className="border-b border-[#00f0ff]/10 pb-4">
      <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
        <Palette className="w-5 h-5 text-[#00f0ff]" /> Design Tokens (Theme Variables)
      </h2>
      <p className="text-xs text-slate-400 mt-1">
        Standardized styling parameters used across the system layout to guarantee aesthetic
        consistency.
      </p>
    </div>

    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
        Color Palette
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-[#00f0ff]/15 bg-[#061125]/30 rounded-xl p-3 flex flex-col space-y-3">
          <div className="h-16 w-full rounded-lg bg-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.7)]" />
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-white">Cyan Primary</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">--color-brand-500</div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 border-t border-slate-900 mt-2 pt-2">
              <span>#00F0FF</span>
              <button
                onClick={() => copyToClipboard('#00f0ff', 'c-cyan')}
                className="text-[#00f0ff] hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedId === 'c-cyan' ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedId === 'c-cyan' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border border-[#00f0ff]/15 bg-[#061125]/30 rounded-xl p-3 flex flex-col space-y-3">
          <div className="h-16 w-full rounded-lg bg-[#040914] border border-slate-900 shadow-inner" />
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-white">Blueprint Navy</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                --color-blueprint-bg
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 border-t border-slate-900 mt-2 pt-2">
              <span>#040914</span>
              <button
                onClick={() => copyToClipboard('#040914', 'c-bg')}
                className="text-[#00f0ff] hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedId === 'c-bg' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId === 'c-bg' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border border-[#00f0ff]/15 bg-[#061125]/30 rounded-xl p-3 flex flex-col space-y-3">
          <div className="h-16 w-full rounded-lg bg-[#0f172a]" />
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-white">Slate Base</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">--color-slate-900</div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 border-t border-slate-900 mt-2 pt-2">
              <span>#0F172A</span>
              <button
                onClick={() => copyToClipboard('#0f172a', 'c-slate')}
                className="text-[#00f0ff] hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedId === 'c-slate' ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedId === 'c-slate' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border border-[#00f0ff]/15 bg-[#061125]/30 rounded-xl p-3 flex flex-col space-y-3">
          <div className="h-16 w-full rounded-lg bg-[#0b2b3f]/30 border border-[#00f0ff]/20 shadow-inner" />
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-white">Grid Guideline</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                --color-blueprint-border
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 border-t border-slate-900 mt-2 pt-2">
              <span>rgba(0,240,255,0.15)</span>
              <button
                onClick={() => copyToClipboard('rgba(0, 240, 255, 0.15)', 'c-grid')}
                className="text-[#00f0ff] hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedId === 'c-grid' ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedId === 'c-grid' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
        Product category accents
      </h3>
      <p className="text-xs text-slate-400">
        Used on the product homepage and docs for Platform, Intelligence, Resilience, and Contract
        badges.
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
            className="border border-[#00f0ff]/15 bg-[#061125]/30 rounded-xl p-3 flex flex-col gap-3"
          >
            <span
              className={`self-start rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${className}`}
            >
              {label}
            </span>
            <p className="text-[10px] text-slate-400 font-mono break-all">{className}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
        Typography Scale
      </h3>
      <div className="border border-[#00f0ff]/10 rounded-xl p-4 bg-[#040914]/40 divide-y divide-[#00f0ff]/5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-2">
          <div>
            <div className="text-xs font-semibold text-slate-400 font-mono">UI Title / Heading</div>
            <div className="text-lg font-extrabold text-white mt-1 font-sans">
              Plus Jakarta Sans - Bold
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400 text-right">
            font-family: var(--font-sans)
            <br />
            letter-spacing: -0.02em
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-2">
          <div>
            <div className="text-xs font-semibold text-slate-400 font-mono">
              Code / Node Identifiers
            </div>
            <div className="text-sm font-semibold text-[#00f0ff] mt-1 font-mono">
              JetBrains Mono - Medium
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400 text-right">
            font-family: var(--font-mono)
            <br />
            font-weight: 500
          </div>
        </div>

        <div className="pt-4 space-y-3 font-sans">
          <div className="flex items-baseline gap-4">
            <span className="text-2xl font-extrabold text-white">Aa</span>
            <span className="text-xs font-mono text-[#00f0ff]">
              H1: 1.5rem (24px) / font-extrabold
            </span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-xl font-bold text-white">Aa</span>
            <span className="text-xs font-mono text-[#00f0ff]">H2: 1.25rem (20px) / font-bold</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-sm font-medium text-slate-300">Aa</span>
            <span className="text-xs font-mono text-[#00f0ff]">
              Body: 0.875rem (14px) / font-normal
            </span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-xs font-normal text-slate-400">Aa</span>
            <span className="text-xs font-mono text-[#00f0ff]">
              Small: 0.75rem (12px) / text-slate-400
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
