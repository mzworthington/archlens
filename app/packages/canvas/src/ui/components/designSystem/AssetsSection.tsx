import React from 'react';
import {
  Copy,
  Check,
  Download,
  FileCode,
  Database,
  Globe,
  Zap,
  Cpu,
  Monitor,
  Smartphone,
} from 'lucide-react';

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="32" height="32" rx="6" fill="#040914" />
  <path d="M 0 16 L 32 16 M 16 0 L 16 32" stroke="#122342" stroke-width="0.75" />
  <path d="M 8 0 V 32 M 24 0 V 32 M 0 8 H 32 M 0 24 H 32" stroke="#091427" stroke-width="0.5" />
  <path d="M 16 5 V 27 M 5 16 H 27" stroke="#00d8ff" stroke-width="1.25" opacity="0.6" filter="url(#glow)" />
  <rect x="11" y="11" width="10" height="10" rx="1.5" fill="#061125" stroke="#00f0ff" stroke-width="2" filter="url(#glow)" />
  <circle cx="16" cy="16" r="2" fill="#00f0ff" />
</svg>`;

const gridSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <path d="M 20 0 L 20 100 M 40 0 L 40 100 M 60 0 L 60 100 M 80 0 L 80 100 M 0 20 L 100 20 M 0 40 L 100 40 M 0 60 L 100 60 M 0 80 L 100 80" fill="none" stroke="rgba(6, 182, 212, 0.05)" stroke-width="0.5" />
  <path d="M 100 0 L 100 100 M 0 100 L 100 100" fill="none" stroke="rgba(6, 182, 212, 0.15)" stroke-width="1" />
</svg>`;

type AssetsSectionProps = {
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  handleDownload: (content: string, filename: string, mimeType: string) => void;
};

export const AssetsSection: React.FC<AssetsSectionProps> = ({
  copiedId,
  copyToClipboard,
  handleDownload,
}) => (
  <div className="space-y-6 animate-fade-in">
    <div className="border-b border-[#00f0ff]/10 pb-4">
      <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
        <FileCode className="w-5 h-5 text-[#00f0ff]" /> Vector Asset Pack
      </h2>
      <p className="text-xs text-slate-400 mt-1">
        Exposes vector graphic source codes directly. Use these files in HTML markup, React
        components, or style sheets.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border border-[#00f0ff]/10 rounded-xl p-4 bg-[#040914]/40 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              1. Favicon (favicon.svg)
            </h4>
            <div className="p-1 border border-[#00f0ff]/20 bg-[#040914] rounded">
              <svg viewBox="0 0 32 32" className="w-6 h-6">
                <path
                  d="M 16 5 V 27 M 5 16 H 27"
                  stroke="#00d8ff"
                  stroke-width="1.25"
                  opacity="0.6"
                />
                <rect
                  x="11"
                  y="11"
                  width="10"
                  height="10"
                  rx="1.5"
                  fill="#061125"
                  stroke="#00f0ff"
                  stroke-width="2"
                />
                <circle cx="16" cy="16" r="2" fill="#00f0ff" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-sans">
            Core brand mark for favicons, app icons and product chrome.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => copyToClipboard(faviconSvg, 'asset-fav')}
            className="flex-1 py-1.5 border border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copiedId === 'asset-fav' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedId === 'asset-fav' ? 'Copied' : 'Copy SVG'}</span>
          </button>
          <button
            onClick={() => handleDownload(faviconSvg, 'favicon.svg', 'image/svg+xml')}
            className="py-1.5 px-3 bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer"
            title="Download SVG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="border border-[#00f0ff]/10 rounded-xl p-4 bg-[#040914]/40 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              2. Blueprint Grid (grid.svg)
            </h4>
            <div className="w-8 h-8 rounded border border-[#00f0ff]/20 bg-[#040914] bg-[linear-gradient(rgba(0,240,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.1)_1px,transparent_1px)] bg-[size:10px_10px]" />
          </div>
          <p className="text-xs text-slate-400 mt-2 font-sans">
            Repeating pattern forming seamless blueprint graph grids. Ideal as a repeatable CSS
            background.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => copyToClipboard(gridSvg, 'asset-grid')}
            className="flex-1 py-1.5 border border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copiedId === 'asset-grid' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedId === 'asset-grid' ? 'Copied' : 'Copy SVG'}</span>
          </button>
          <button
            onClick={() => handleDownload(gridSvg, 'grid.svg', 'image/svg+xml')}
            className="py-1.5 px-3 bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer"
            title="Download SVG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <div className="space-y-3 mt-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
        Design System Schematic Icons
      </h3>
      <p className="text-xs text-slate-400">
        Customized vector icons representing typical node formats rendered using glowing outlines.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Web App', icon: Monitor },
          { label: 'Mobile Device', icon: Smartphone },
          { label: 'Microservice', icon: Cpu },
          { label: 'Database Cyl', icon: Database },
          { label: 'REST Endpoint', icon: Globe },
          { label: 'Lambda Trigger', icon: Zap },
        ].map((node, i) => (
          <div
            key={i}
            className="border border-[#00f0ff]/10 rounded-xl p-3 bg-[#040914]/60 text-center flex flex-col items-center justify-center space-y-2"
          >
            <node.icon className="w-7 h-7 text-[#00f0ff] filter drop-shadow-[0_0_4px_rgba(0,240,255,0.5)]" />
            <div className="text-[10px] font-mono text-slate-300">{node.label}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
