import React from 'react';
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
    <div className="border-b border-[#00f0ff]/10 pb-4">
      <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
        <Sliders className="w-5 h-5 text-[#00f0ff]" /> Interactive Component Sandbox
      </h2>
      <p className="text-xs text-slate-400 mt-1">
        Adjust options below to live customize a blueprint node component card, verifying the design
        system's reactivity.
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Sandbox Controls */}
      <div className="lg:col-span-5 bg-[#040914]/60 border border-[#00f0ff]/10 rounded-xl p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
            Node Title
          </label>
          <input
            type="text"
            value={sandboxTitle}
            onChange={e => setSandboxTitle(e.target.value)}
            className="w-full bg-[#040914] border border-[#00f0ff]/25 focus:border-[#00f0ff] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
            Type Symbol
          </label>
          <select
            value={sandboxNodeType}
            onChange={e => setSandboxNodeType(e.target.value as SandboxNodeType)}
            className="w-full bg-[#040914] border border-[#00f0ff]/25 focus:border-[#00f0ff] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="person">Person (Actor)</option>
            <option value="web-app">Web App</option>
            <option value="database">Database</option>
            <option value="microservice">Microservice</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
            Description
          </label>
          <textarea
            value={sandboxDesc}
            onChange={e => setSandboxDesc(e.target.value)}
            rows={2}
            className="w-full bg-[#040914] border border-[#00f0ff]/25 focus:border-[#00f0ff] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
            Status Level
          </label>
          <div className="flex gap-2">
            {(['healthy', 'warning', 'error'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSandboxStatus(s)}
                className={`flex-1 py-1 rounded text-[10px] font-mono capitalize border transition ${
                  sandboxStatus === s
                    ? s === 'healthy'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                      : s === 'warning'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-400'
                        : 'bg-red-950/80 border-red-500 text-red-400'
                    : 'border-[#00f0ff]/10 text-slate-500 hover:bg-slate-900/40'
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
        <div className="p-8 border border-dashed border-[#00f0ff]/25 bg-[#040914]/80 rounded-2xl flex items-center justify-center min-h-[180px]">
          <div className="w-80 glass-panel border border-[#00f0ff]/30 p-4 rounded-xl flex flex-col space-y-3 relative group overflow-hidden">
            {/* Connection Handle indicators */}
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#00f0ff] border-2 border-[#040914] rounded-full shadow-[0_0_6px_#00f0ff]" />
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#00f0ff] border-2 border-[#040914] rounded-full shadow-[0_0_6px_#00f0ff]" />

            {/* Title & Icon Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 border border-[#00f0ff]/30 rounded bg-cyan-950/10">
                  {sandboxNodeType === 'person' && <Cpu className="w-4 h-4 text-[#00f0ff]" />}
                  {sandboxNodeType === 'web-app' && <Monitor className="w-4 h-4 text-[#00f0ff]" />}
                  {sandboxNodeType === 'database' && (
                    <Database className="w-4 h-4 text-[#00f0ff]" />
                  )}
                  {sandboxNodeType === 'microservice' && <Cpu className="w-4 h-4 text-[#00f0ff]" />}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white font-mono tracking-tight leading-none">
                    {sandboxTitle}
                  </h4>
                  <span className="text-[8px] text-[#00f0ff] font-mono uppercase tracking-wider mt-1 block">
                    {sandboxNodeType}
                  </span>
                </div>
              </div>

              {/* Status Marker */}
              <span
                className={`w-2 h-2 rounded-full ${
                  sandboxStatus === 'healthy'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                    : sandboxStatus === 'warning'
                      ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                      : 'bg-red-500 shadow-[0_0_8px_#f43f5e]'
                }`}
              />
            </div>

            {/* Description */}
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed line-clamp-2 border-t border-slate-900 pt-2.5">
              {sandboxDesc || 'No component description provided...'}
            </p>
          </div>
        </div>

        {/* Schema export preview */}
        <div className="bg-[#040914]/90 border border-slate-900 rounded-xl p-3 font-mono text-[10px] text-slate-300">
          <div className="text-[#00f0ff] mb-1 font-bold">// Serialized YAML Model Output:</div>
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
