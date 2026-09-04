import React from 'react';
import { Link } from 'wouter';
import { Layers, ArrowRight, Terminal, ShieldAlert } from 'lucide-react';
import { PRODUCT_CATEGORY_STYLES } from './shared';

export const ComponentsSection: React.FC = () => (
  <div className="space-y-8 animate-fade-in">
    <div className="border-b border-[#00f0ff]/10 pb-4 sticky top-0 bg-[#061125]/90 backdrop-blur-md z-10">
      <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
        <Layers className="w-5 h-5 text-[#00f0ff]" /> UI Component Standards
      </h2>
      <p className="text-xs text-slate-400 mt-1">
        Reusable UI patterns styled explicitly using the blueprint and glassmorphic variables.
      </p>
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
        1. Calls to action
      </h3>
      <p className="text-xs text-slate-400">
        Marketing surfaces (homepage, docs hero) use solid primary and outline secondary buttons.
        Canvas toolbars may use the glow variant below.
      </p>
      <div className="flex flex-wrap gap-4 items-center">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[#00f0ff]/90 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-[#00f0ff] transition-colors cursor-pointer"
        >
          Primary CTA
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          className="rounded-xl border border-[#00f0ff]/40 px-5 py-3 text-sm font-semibold text-[#00f0ff] hover:text-white hover:bg-[#00f0ff]/10 hover:border-[#00f0ff] transition-colors cursor-pointer"
        >
          Secondary CTA
        </button>
        <button
          type="button"
          className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
        >
          Tertiary CTA
        </button>
      </div>
      <div className="flex flex-wrap gap-4 items-center pt-2 border-t border-[#00f0ff]/10">
        <button className="px-4 py-2 bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/40 hover:border-[#00f0ff] rounded-lg text-xs font-bold shadow-[0_0_10px_rgba(0,240,255,0.15)] hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] transition cursor-pointer">
          Canvas glow (toolbar)
        </button>
        <button className="px-4 py-2 border border-dashed border-[#00f0ff]/30 hover:border-brand-500/80 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer">
          Dashed target
        </button>
      </div>
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
        2. Glassmorphic Blueprint Cards
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel p-4 rounded-xl flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold font-mono text-[#00f0ff] uppercase tracking-wider">
              Container Block
            </h4>
            <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
              Features faint cyan borders (
              <code className="text-[#00f0ff] font-mono">1px solid rgba(0, 240, 255, 0.15)</code>)
              and heavy glass blurs (<code className="text-[#00f0ff] font-mono">blur(12px)</code>)
              stacked over deep card offsets.
            </p>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">CLASS: glass-panel</div>
        </div>

        <div className="glass-panel-light p-4 rounded-xl flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">
              Subtle Component
            </h4>
            <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
              Features lighter backdrops (
              <code className="text-[#00f0ff] font-mono">rgba(255, 255, 255, 0.02)</code>) for inner
              items or nesting panels.
            </p>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">CLASS: glass-panel-light</div>
        </div>
      </div>
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
        3. Product marketing cards
      </h3>
      <p className="text-xs text-slate-400">
        Homepage and docs use full-card links with icon, category badge, tagline and body copy.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Link
          href="/guide/chaoslens"
          className="group flex flex-col rounded-xl border border-[#00f0ff]/25 bg-[#040914]/80 p-5 transition-all hover:border-[#00f0ff]/35 hover:bg-[#061125]/90"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#00f0ff]/15 bg-[#00f0ff]/5 text-[#00f0ff]">
              <ShieldAlert className="h-5 w-5" aria-hidden />
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${PRODUCT_CATEGORY_STYLES.Resilience}`}
            >
              Resilience
            </span>
          </div>
          <h4 className="mt-4 text-base font-semibold text-white group-hover:text-[#00f0ff] transition-colors">
            ChaosLens
          </h4>
          <p className="mt-1 text-xs font-medium text-slate-300">
            What-if failures on the live diagram
          </p>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Fault a service on the map you have open. Blast radius and SLA bands, without a game day
            in production.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#00f0ff]">
            ChaosLens guide
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </Link>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#00f0ff]/10 bg-[#040914]/60 p-5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#00f0ff]/30 bg-[#00f0ff]/10 font-mono text-xs font-bold text-[#00f0ff]">
              2
            </span>
            <h4 className="mt-3 text-sm font-semibold text-white">Flow step card</h4>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Numbered steps for &quot;From repo to ranked list&quot; on the homepage.
            </p>
          </div>
          <div className="rounded-2xl border border-[#00f0ff]/15 bg-gradient-to-br from-[#00f0ff]/10 via-transparent to-transparent p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#00f0ff]/20 bg-[#00f0ff]/10 text-[#00f0ff]">
                <Terminal className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">CTA strip</h4>
                <p className="text-xs text-slate-400">Closing banner with dual actions</p>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-xl bg-[#00f0ff]/90 px-4 py-2 text-xs font-semibold text-slate-950"
            >
              Open canvas
            </button>
          </div>
        </div>
      </div>
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
        4. Level badges & status markers
      </h3>
      <div className="flex flex-wrap gap-3">
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/80 border border-emerald-900/40 text-emerald-400 font-mono">
          Context
        </span>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-950/80 border border-blue-900/40 text-blue-400 font-mono">
          Container
        </span>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-950/80 border border-purple-900/40 text-purple-400 font-mono">
          Component
        </span>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950/80 border border-amber-900/40 text-amber-400 font-mono">
          Code
        </span>
      </div>
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
        5. Terminal form inputs
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
            Input Node Name
          </label>
          <input
            type="text"
            placeholder="MyServiceComponent"
            className="w-full bg-[#040914] border border-[#00f0ff]/25 focus:border-[#00f0ff] focus:shadow-[0_0_10px_rgba(0,240,255,0.15)] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none transition duration-200"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
            Select Format
          </label>
          <select className="w-full bg-[#040914] border border-[#00f0ff]/25 focus:border-[#00f0ff] focus:shadow-[0_0_10px_rgba(0,240,255,0.15)] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none transition duration-200 cursor-pointer">
            <option>microservice</option>
            <option>relational-database</option>
            <option>event-broker</option>
          </select>
        </div>
      </div>
    </div>
  </div>
);
