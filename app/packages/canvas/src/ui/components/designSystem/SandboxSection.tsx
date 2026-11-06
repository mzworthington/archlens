import React from 'react';
import { NODE_STATUS_MARKERS, NODE_STATUS_STYLES } from './shared';
import { Sliders, Cpu, Monitor, Database } from 'lucide-react';

type SandboxNodeType = 'person' | 'software-system' | 'web-app' | 'database' | 'microservice';
type SandboxStatus = 'healthy' | 'warning' | 'error';

type SandboxSectionProps = {
  sandboxNodeType: SandboxNodeType;
  setSandboxNodeType: (type: SandboxNodeType) => void;
  sandboxTitle: string;
  setSandboxTitle: (title: string) => void;
  sandboxDesc: string;
  setSandboxDesc: (desc: string) => void;
  sandboxStatus: SandboxStatus;
  setSandboxStatus: (status: SandboxStatus) => void;
};

export const SandboxSection: React.FC<SandboxSectionProps> = ({
  sandboxNodeType,
  setSandboxNodeType,
  sandboxTitle,
  setSandboxTitle,
  sandboxDesc,
  setSandboxDesc,
  sandboxStatus,
  setSandboxStatus,
}) => (
  <div className="space-y-6 animate-fade-in">
    <div className="border-b border-accent/10 pb-4">
      <h2 className="text-xl font-bold text-ink tracking-tight flex items-center gap-2">
        <Sliders className="w-5 h-5 text-accent" /> Interactive Component Sandbox
      </h2>
      <p className="text-xs text-slate-400 mt-1">
        Adjust options below to live customize a blueprint node component card, verifying the design
        system's reactivity.
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Sandbox Controls */}
      <div className="lg:col-span-5 bg-navy/60 border border-accent/10 rounded-xl p-4 space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="sandbox-node-title"
            className="text-[10px] font-bold font-mono text-slate-400 uppercase"
          >
            Node Title
          </label>
          <input
            id="sandbox-node-title"
            type="text"
            value={sandboxTitle}
            onChange={e => setSandboxTitle(e.target.value)}
            className="w-full bg-navy border border-accent/25 focus:border-accent rounded-lg px-3 py-1.5 text-xs font-mono text-ink focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="sandbox-type-symbol"
            className="text-[10px] font-bold font-mono text-slate-400 uppercase"
          >
            Type Symbol
          </label>
          <select
            id="sandbox-type-symbol"
            value={sandboxNodeType}
            onChange={e => setSandboxNodeType(e.target.value as SandboxNodeType)}
            className="w-full bg-navy border border-accent/25 focus:border-accent rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="person">Person (Actor)</option>
            <option value="web-app">Web App</option>
            <option value="database">Database</option>
            <option value="microservice">Microservice</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="sandbox-description"
            className="text-[10px] font-bold font-mono text-slate-400 uppercase"
          >
            Description
          </label>
          <textarea
            id="sandbox-description"
            value={sandboxDesc}
            onChange={e => setSandboxDesc(e.target.value)}
            rows={2}
            className="w-full bg-navy border border-accent/25 focus:border-accent rounded-lg px-3 py-1.5 text-xs font-mono text-ink focus:outline-none resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="sandbox-status-healthy"
            className="text-[10px] font-bold font-mono text-slate-400 uppercase"
          >
            Status Level
          </label>
          <div className="flex gap-2" role="group" aria-label="Status Level">
            {(['healthy', 'warning', 'error'] as const).map(s => (
              <button
                key={s}
                id={s === 'healthy' ? 'sandbox-status-healthy' : undefined}
                type="button"
                onClick={() => setSandboxStatus(s)}
                className={`flex-1 py-1 rounded text-[10px] font-mono capitalize border transition ${
                  sandboxStatus === s
                    ? NODE_STATUS_STYLES[s]
                    : 'border-accent/10 text-ink/45 hover:bg-surface'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
          Live Renderer Output
        </h3>

        {/* Glowing Node Component */}
        <div className="p-8 border border-dashed border-accent/25 bg-navy/80 rounded-2xl flex items-center justify-center min-h-[180px]">
          <div className="w-80 glass-panel border border-accent/30 p-4 rounded-xl flex flex-col space-y-3 relative group overflow-hidden">
            {/* Connection Handle indicators */}
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-accent border-2 border-navy rounded-full shadow-[0_0_6px_var(--color-accent)]" />
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-accent border-2 border-navy rounded-full shadow-[0_0_6px_var(--color-accent)]" />

            {/* Title & Icon Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 border border-accent/30 rounded bg-cyan-950/10">
                  {sandboxNodeType === 'person' && <Cpu className="w-4 h-4 text-accent" />}
                  {sandboxNodeType === 'web-app' && <Monitor className="w-4 h-4 text-accent" />}
                  {sandboxNodeType === 'database' && <Database className="w-4 h-4 text-accent" />}
                  {sandboxNodeType === 'microservice' && <Cpu className="w-4 h-4 text-accent" />}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-ink font-mono tracking-tight leading-none">
                    {sandboxTitle}
                  </h4>
                  <span className="text-[8px] text-accent font-mono uppercase tracking-wider mt-1 block">
                    {sandboxNodeType}
                  </span>
                </div>
              </div>

              {/* Status Marker */}
              <span className={`w-2 h-2 rounded-full ${NODE_STATUS_MARKERS[sandboxStatus]}`} />
            </div>

            {/* Description */}
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed line-clamp-2 border-t border-slate-900 pt-2.5">
              {sandboxDesc || 'No component description provided...'}
            </p>
          </div>
        </div>

        <div className="bg-navy/90 border border-slate-900 rounded-xl p-3 font-mono text-[10px] text-slate-300">
          <div className="text-accent mb-1 font-bold">{'// Serialized YAML Model Output:'}</div>
          <div>id: {sandboxTitle.toLowerCase().replace(/\s+/g, '-')}</div>
          <div>title: {sandboxTitle}</div>
          <div>type: {sandboxNodeType}</div>
          <div>description: {sandboxDesc}</div>
          <div>status: {sandboxStatus}</div>
        </div>
      </div>
    </div>
  </div>
);
