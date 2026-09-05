import type { WorkspaceComplexitySummary as Summary } from '../../../application/forensics/summarizeWorkspaceForensics';
import { browserLiteComplexityEmptyCopy } from '../../../application/analysis/persistBrowserLiteScan';

function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#00f0ff]/10 bg-[#040914]/70 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-100 tabular-nums">{value}</p>
    </div>
  );
}

type Props = {
  summary: Summary;
  isBrowserLiteWorkspace?: boolean;
};

/** Estate / per-repo complexity markers for the loaded workspace. */
export function WorkspaceComplexitySummary({ summary, isBrowserLiteWorkspace = false }: Props) {
  const avg = summary.avgComplexity == null ? '-' : formatCount(summary.avgComplexity);

  return (
    <section
      className="mb-6"
      data-testid="workspace-complexity-summary"
      aria-label="Workspace complexity"
    >
      <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-slate-300 mb-3">
        Workspace complexity
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryStat label="Diagrams" value={formatCount(summary.diagramCount)} />
        <SummaryStat label="Nodes" value={formatCount(summary.nodeCount)} />
        <SummaryStat label="Dependencies" value={formatCount(summary.dependencyCount)} />
        <SummaryStat label="Files (forensics)" value={formatCount(summary.fileCount)} />
        <SummaryStat label="LOC" value={formatCount(summary.totalLoc)} />
        <SummaryStat label="SLOC" value={formatCount(summary.totalSloc)} />
        <SummaryStat label="Max complexity" value={formatCount(summary.maxComplexity)} />
        <SummaryStat label="Avg complexity" value={avg} />
        <SummaryStat label="Hotspot nodes" value={formatCount(summary.hotspotNodes)} />
        <SummaryStat label="Knowledge silos" value={formatCount(summary.knowledgeSiloNodes)} />
        <SummaryStat label="Nodes with TraceLens" value={formatCount(summary.nodesWithForensics)} />
      </div>
      {summary.diagramCount > 0 && summary.nodesWithForensics === 0 ? (
        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
          {browserLiteComplexityEmptyCopy(isBrowserLiteWorkspace) ?? (
            <>
              Topology is loaded, but no TraceLens blocks were found. Re-scan with git enabled or
              run <span className="font-mono text-slate-400">archlens enrich --git</span> to
              populate LOC and complexity.
            </>
          )}
        </p>
      ) : null}
    </section>
  );
}
