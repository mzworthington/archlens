import React, { useState } from 'react';
import { ScanSearch, Terminal } from 'lucide-react';
import { DEMO_GRADUATION } from '../../../../content/demoGraduation';
import { CliCopyCommands } from '../../../../components/CliCopyCommands/CliCopyCommands';

export type DemoGraduationCtaProps = {
  onScanRepo: () => void;
};

export const DemoGraduationCta: React.FC<DemoGraduationCtaProps> = ({ onScanRepo }) => {
  const [cliOpen, setCliOpen] = useState(false);

  return (
    <section
      className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-3 space-y-3"
      aria-labelledby="demo-graduation-heading"
      data-testid="demo-graduation"
    >
      <div>
        <h3 id="demo-graduation-heading" className="text-sm font-semibold text-slate-100">
          {DEMO_GRADUATION.title}
        </h3>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">{DEMO_GRADUATION.lede}</p>
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onScanRepo}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-800/60 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-950/70 transition cursor-pointer"
          data-testid="demo-graduation-scan-browser"
        >
          <ScanSearch className="w-3.5 h-3.5" aria-hidden />
          {DEMO_GRADUATION.scanBrowser}
        </button>
        <button
          type="button"
          onClick={() => setCliOpen(open => !open)}
          aria-expanded={cliOpen}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-950/60 transition cursor-pointer"
          data-testid="demo-graduation-unlock-cli"
        >
          <Terminal className="w-3.5 h-3.5" aria-hidden />
          {DEMO_GRADUATION.unlockCli}
        </button>
      </div>
      {cliOpen ? <CliCopyCommands testIdPrefix="demo-graduation-cli" /> : null}
    </section>
  );
};
