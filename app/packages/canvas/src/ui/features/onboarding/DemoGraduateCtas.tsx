import React from 'react';
import { ScanSearch, Terminal } from 'lucide-react';
import { useBlueprintStore } from '../../../application/store/store';
import { CliCommandCopyStrip } from '../../components/WorkspaceEntryPanel/CliCommandCopyStrip';

type DemoGraduateCtasProps = {
  testId?: string;
};

/**
 * Dual next-step after the golden Chaos → Advice demo: scan this tab, or copy CLI commands.
 */
export const DemoGraduateCtas: React.FC<DemoGraduateCtasProps> = ({
  testId = 'demo-graduate-ctas',
}) => {
  const isSampleWorkspace = useBlueprintStore(s => s.isSampleWorkspace);
  const openBrowserLiteScan = useBlueprintStore(s => s.openBrowserLiteScan);
  const [cliOpen, setCliOpen] = React.useState(false);

  if (!isSampleWorkspace) return null;

  return (
    <div
      className="mt-4 space-y-3 rounded-xl border border-[#00f0ff]/20 bg-[#040914]/80 p-4"
      data-testid={testId}
    >
      <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Next</p>
      <p className="text-sm text-slate-300 leading-relaxed">
        Scan your own repo in this tab (including git hotspots), or install the CLI for watch mode
        and CI publish.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => void openBrowserLiteScan()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-3 py-2 text-sm font-semibold text-[#00f0ff] hover:border-[#00f0ff]/50 cursor-pointer"
          data-testid={`${testId}-scan`}
        >
          <ScanSearch className="w-4 h-4" aria-hidden />
          Scan your repo in the browser
        </button>
        <button
          type="button"
          onClick={() => setCliOpen(open => !open)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-sm font-semibold text-emerald-200 hover:border-emerald-400/50 cursor-pointer"
          aria-expanded={cliOpen}
          data-testid={`${testId}-cli`}
        >
          <Terminal className="w-4 h-4" aria-hidden />
          Install CLI for watch and CI
        </button>
      </div>
      {cliOpen ? <CliCommandCopyStrip testIdPrefix={`${testId}-cli`} /> : null}
    </div>
  );
};
