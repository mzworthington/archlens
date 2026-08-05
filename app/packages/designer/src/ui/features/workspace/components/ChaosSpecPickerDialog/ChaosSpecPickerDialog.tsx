import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ListTree, ShieldAlert, X } from 'lucide-react';
import {
  resolveChaosSpecCatalogAvailability,
  type ChaosSpecCatalogEntry,
} from '@archlens/core/resilience';
import { useBlueprintStore } from '../../../../../application/store/store';
import { openChaosSpecOnCanvas } from '../../../../../application/resilience/openChaosSpecOnCanvas';
import {
  loadBundledChaosSpecCatalog,
  loadBundledChaosSpecYaml,
  loadWorkspaceChaosSpecs,
  mergeChaosSpecCatalogSources,
} from '../../../../../infrastructure/fileSystem/bundledChaosSpecCatalog';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const ChaosSpecPickerDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const [, setLocation] = useLocation();
  const workspaceCatalog = useBlueprintStore(s => s.workspaceCatalog);
  const workspacePort = useBlueprintStore(s => s.workspacePort);
  const selectSystem = useBlueprintStore(s => s.selectSystem);
  const applyChaosSpecYaml = useBlueprintStore(s => s.applyChaosSpecYaml);
  const runResilienceSimulation = useBlueprintStore(s => s.runResilienceSimulation);
  const setNotification = useBlueprintStore(s => s.setNotification);

  const [entries, setEntries] = useState<ChaosSpecCatalogEntry[]>([]);
  const [workspaceYamlById, setWorkspaceYamlById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      // Show bundled catalog immediately — do not wait on workspace scanning.
      let bundled: ChaosSpecCatalogEntry[] = [];
      try {
        bundled = await loadBundledChaosSpecCatalog();
        if (cancelled) return;
        setEntries(bundled);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load ChaosSpec catalog');
        setEntries([]);
        setLoading(false);
        return;
      }

      try {
        const workspace = await loadWorkspaceChaosSpecs(workspacePort);
        if (cancelled) return;
        setEntries(mergeChaosSpecCatalogSources(bundled, workspace.entries));
        setWorkspaceYamlById(workspace.yamlById);
      } catch (err) {
        if (cancelled) return;
        // Bundled list is already visible; surface workspace scan failures softly.
        setLoadError(err instanceof Error ? err.message : 'Failed to scan workspace ChaosSpecs');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, workspacePort]);

  const visibleEntries = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      entry =>
        entry.name.toLowerCase().includes(q) ||
        entry.diagramRef.toLowerCase().includes(q) ||
        (entry.description?.toLowerCase().includes(q) ?? false)
    );
  }, [entries, filter]);

  const openEntry = useCallback(
    async (entry: ChaosSpecCatalogEntry, simulate: boolean) => {
      const availability = resolveChaosSpecCatalogAvailability(entry, workspaceCatalog);
      if (availability === 'diagram-missing') {
        setNotification({
          type: 'warning',
          title: 'Diagram not in workspace',
          message: `"${entry.name}" targets ${entry.diagramRef}, which is not loaded. Open the samples estate or a folder that includes that BlueprintSpec.`,
        });
        return;
      }

      setOpeningId(entry.id);
      try {
        const yaml = workspaceYamlById.get(entry.id) ?? (await loadBundledChaosSpecYaml(entry.id));
        const result = await openChaosSpecOnCanvas(
          yaml,
          {
            workspaceCatalog,
            setLocation,
            selectSystem,
            applyChaosSpecYaml,
            runResilienceSimulation,
          },
          { simulate }
        );
        if (!result.ok) {
          setNotification({
            type: 'error',
            title: 'Could not open ChaosSpec',
            message: result.reason,
          });
          return;
        }
        setNotification({
          type: 'success',
          title: 'ChaosSpec loaded',
          message: `${result.document.metadata.name} on ${result.document.metadata.diagramRef}`,
        });
        onClose();
      } catch (err) {
        setNotification({
          type: 'error',
          title: 'Could not open ChaosSpec',
          message: err instanceof Error ? err.message : 'Unexpected error',
        });
      } finally {
        setOpeningId(null);
      }
    },
    [
      workspaceCatalog,
      workspaceYamlById,
      setLocation,
      selectSystem,
      applyChaosSpecYaml,
      runResilienceSimulation,
      setNotification,
      onClose,
    ]
  );

  return (
    <div
      className={`fixed inset-0 z-[100] ${isOpen ? 'visible' : 'invisible pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chaos-spec-picker-title"
      data-testid="chaos-spec-picker-dialog"
    >
      <div
        className={`fixed inset-0 bg-[#020617]/80 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl transition-all duration-300 ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ListTree className="w-4 h-4 text-[#00f0ff] shrink-0" />
              <h2
                id="chaos-spec-picker-title"
                className="font-bold text-[#00f0ff] uppercase tracking-wider font-mono text-xs"
              >
                Browse ChaosSpecs
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close ChaosSpec catalog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 border-b border-slate-800 shrink-0 space-y-2">
            <p className="text-xs text-slate-400 leading-relaxed">
              Pick a scenario to open its diagram in ChaosLens and load the faults. Bundled samples
              ship with Canvas; workspace files under{' '}
              <code className="text-slate-300">chaos-specs/</code> appear here too.
            </p>
            <label className="block">
              <span className="sr-only">Filter ChaosSpecs</span>
              <input
                type="search"
                value={filter}
                onChange={event => setFilter(event.target.value)}
                placeholder="Filter by name or diagram…"
                className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]/50"
                data-testid="chaos-spec-picker-filter"
              />
            </label>
          </div>

          <div
            className="flex-1 overflow-y-auto p-3 space-y-2"
            data-testid="chaos-spec-picker-list"
          >
            {loading ? (
              <p className="text-xs text-slate-500 px-2 py-6 text-center">Loading catalog…</p>
            ) : null}
            {loadError ? (
              <p className="text-xs text-rose-300 px-2 py-6 text-center" role="alert">
                {loadError}
              </p>
            ) : null}
            {!loading && !loadError && visibleEntries.length === 0 ? (
              <p className="text-xs text-slate-500 px-2 py-6 text-center">No ChaosSpecs match.</p>
            ) : null}
            {visibleEntries.map(entry => {
              const availability = resolveChaosSpecCatalogAvailability(entry, workspaceCatalog);
              const unavailable = availability === 'diagram-missing';
              const busy = openingId === entry.id;
              return (
                <div
                  key={entry.id}
                  className={`rounded-lg border px-3 py-3 ${
                    unavailable
                      ? 'border-slate-800 bg-slate-950/40 opacity-70'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                  data-testid={`chaos-spec-picker-row-${entry.id}`}
                  data-available={unavailable ? 'false' : 'true'}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
                        <p className="text-sm font-semibold text-slate-100 truncate">
                          {entry.name}
                        </p>
                      </div>
                      {entry.description ? (
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {entry.description}
                        </p>
                      ) : null}
                      <p className="text-[11px] font-mono text-slate-500">
                        {entry.diagramRef} · {entry.faultCount} fault
                        {entry.faultCount === 1 ? '' : 's'}
                      </p>
                      {unavailable ? (
                        <p className="text-[11px] text-amber-300/90">
                          Target diagram not in this workspace
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={unavailable || busy}
                        onClick={() => void openEntry(entry, false)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold rounded-md bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#00f0ff]/15 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        data-testid={`chaos-spec-picker-open-${entry.id}`}
                      >
                        {busy ? 'Opening…' : 'Open'}
                      </button>
                      <button
                        type="button"
                        disabled={unavailable || busy}
                        onClick={() => void openEntry(entry, true)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold rounded-md text-slate-300 border border-slate-700 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        data-testid={`chaos-spec-picker-simulate-${entry.id}`}
                      >
                        Open & simulate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
