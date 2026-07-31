import React from 'react';
import { Copy, Download, FileUp, RefreshCcw, ShieldAlert, X } from 'lucide-react';
import { useChaosSpecDialog, type ChaosSpecDialogMode } from './useChaosSpecDialog';

interface ChaosSpecDialogProps {
  isOpen: boolean;
  mode: ChaosSpecDialogMode;
  onModeChange: (mode: ChaosSpecDialogMode) => void;
  onClose: () => void;
}

const tabClass = (active: boolean) =>
  `px-3 py-1.5 text-[11px] font-semibold rounded-md transition cursor-pointer ${
    active
      ? 'bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30'
      : 'text-slate-400 hover:text-slate-200 border border-transparent'
  }`;

export const ChaosSpecDialog: React.FC<ChaosSpecDialogProps> = ({
  isOpen,
  mode,
  onModeChange,
  onClose,
}) => {
  const {
    yamlText,
    setYamlText,
    parseError,
    preview,
    activeDiagramRef,
    canExport,
    handleFileUpload,
    handleApply,
    handleCopy,
    handleDownload,
    refreshExportYaml,
    applying,
    copying,
    downloading,
    canApply,
    canCopyOrDownload,
  } = useChaosSpecDialog(isOpen, mode, onModeChange, onClose);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const document = preview?.document;
  const isImport = mode === 'import';

  return (
    <div
      className={`fixed inset-0 z-[100] ${isOpen ? 'visible' : 'invisible pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chaos-spec-dialog-title"
      data-testid="chaos-spec-dialog"
    >
      <div
        className={`fixed inset-0 bg-[#020617]/80 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`pointer-events-auto w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl transition-all duration-300 ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <ShieldAlert className="w-4 h-4 text-[#00f0ff]" />
                <h2
                  id="chaos-spec-dialog-title"
                  className="font-bold text-[#00f0ff] uppercase tracking-wider font-mono text-xs"
                >
                  ChaosSpec
                </h2>
              </div>
              <div className="flex items-center gap-1" role="tablist" aria-label="ChaosSpec mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isImport}
                  className={tabClass(isImport)}
                  onClick={() => onModeChange('import')}
                  data-testid="chaos-spec-tab-import"
                >
                  Import
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isImport}
                  className={tabClass(!isImport)}
                  onClick={() => onModeChange('export')}
                  data-testid="chaos-spec-tab-export"
                >
                  Export
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
            <p className="text-xs text-slate-500 leading-relaxed">
              {isImport ? (
                <>
                  Paste or upload a ChaosSpec YAML scenario. It references the active blueprint by{' '}
                  <code className="text-slate-400">metadata.diagramRef</code> — no duplicated
                  topology.
                </>
              ) : (
                <>
                  Export the active scenario as version-controlled YAML. Edit the text before
                  copying or downloading if you want to tweak metadata.
                </>
              )}{' '}
              Active diagram: <code className="text-emerald-300">{activeDiagramRef}</code>
            </p>

            {!isImport && !canExport ? (
              <div className="text-xs text-amber-300/90 bg-amber-950/20 border border-amber-900/40 rounded-lg p-3">
                Add at least one fault to the scenario before exporting.
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase text-slate-500 tracking-wider">
                  ChaosSpec YAML
                </label>
                <div className="flex items-center gap-3">
                  {!isImport && canExport ? (
                    <button
                      type="button"
                      onClick={refreshExportYaml}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      data-testid="chaos-spec-refresh-export"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Refresh from scenario
                    </button>
                  ) : null}
                  {isImport ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      Upload file
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".yaml,.yml,text/yaml,text/plain"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>
              <textarea
                value={yamlText}
                onChange={e => setYamlText(e.target.value)}
                readOnly={!isImport && !canExport}
                placeholder={
                  isImport
                    ? `# yaml-language-server: $schema=https://archlens.dev/schemas/latest/chaos.schema.json\nversion: https://archlens.dev/schemas/v1/chaos.schema.json\nmetadata:\n  name: Payment region outage\n  diagramRef: application/shop\nfaults:\n  - nodeId: application/shop/payment\n    faultType: region-outage`
                    : 'Build a scenario in the resilience panel, then export it here.'
                }
                className="w-full h-48 bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500/40 resize-y"
                spellCheck={false}
                data-testid="chaos-spec-yaml-editor"
              />
            </div>

            {parseError && (
              <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg p-3">
                {parseError}
              </div>
            )}

            {document && !parseError && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2">
                <p className="text-[10px] font-mono uppercase text-slate-500">Preview</p>
                <p className="text-sm font-semibold text-slate-100">{document.metadata.name}</p>
                {document.metadata.description ? (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {document.metadata.description}
                  </p>
                ) : null}
                <ul className="text-xs text-slate-400 space-y-1 font-mono">
                  <li>diagramRef: {document.metadata.diagramRef}</li>
                  <li>
                    faults: {document.faults.length} (
                    {document.faults.map(fault => fault.faultType).join(', ')})
                  </li>
                  {document.monteCarlo ? <li>monteCarlo: enabled</li> : null}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-slate-800 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              Close
            </button>
            {isImport ? (
              <>
                <button
                  onClick={() => void handleApply(false)}
                  disabled={!canApply || applying}
                  className="px-4 py-2 text-xs font-semibold border border-[#00f0ff]/30 text-[#00f0ff] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  {applying ? 'Applying…' : 'Load scenario'}
                </button>
                <button
                  onClick={() => void handleApply(true)}
                  disabled={!canApply || applying}
                  className="px-4 py-2 text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  {applying ? 'Applying…' : 'Load & simulate'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => void handleCopy()}
                  disabled={!canCopyOrDownload || copying}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-[#00f0ff]/30 text-[#00f0ff] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  data-testid="chaos-spec-copy"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copying ? 'Copying…' : 'Copy'}
                </button>
                <button
                  onClick={() => void handleDownload()}
                  disabled={!canCopyOrDownload || downloading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  data-testid="chaos-spec-download"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloading ? 'Saving…' : 'Download'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
