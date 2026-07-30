import React from 'react';
import { FileUp, ShieldAlert, X } from 'lucide-react';
import { useImportChaosSpecDialog } from './useImportChaosSpecDialog';

interface ImportChaosSpecDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportChaosSpecDialog: React.FC<ImportChaosSpecDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    yamlText,
    setYamlText,
    parseError,
    preview,
    activeDiagramRef,
    handleFileUpload,
    handleApply,
    applying,
    canApply,
  } = useImportChaosSpecDialog(isOpen, onClose);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const document = preview?.document;

  return (
    <div
      className={`fixed inset-0 z-[100] ${isOpen ? 'visible' : 'invisible pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-chaos-spec-title"
      data-testid="import-chaos-spec-dialog"
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
          <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#00f0ff]" />
              <h2
                id="import-chaos-spec-title"
                className="font-bold text-[#00f0ff] uppercase tracking-wider font-mono text-xs"
              >
                Load ChaosSpec
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
            <p className="text-xs text-slate-500 leading-relaxed">
              Paste or upload a ChaosSpec YAML scenario. It references the active blueprint by{' '}
              <code className="text-slate-400">metadata.diagramRef</code> — no duplicated topology.
              Active diagram: <code className="text-emerald-300">{activeDiagramRef}</code>
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase text-slate-500 tracking-wider">
                  ChaosSpec YAML
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  Upload file
                </button>
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
                placeholder={`# yaml-language-server: $schema=https://archlens.dev/schemas/latest/chaos.schema.json\nversion: https://archlens.dev/schemas/v1/chaos.schema.json\nmetadata:\n  name: Payment region outage\n  diagramRef: blueprint/shop\nfaults:\n  - nodeId: blueprint/shop/payment\n    faultType: region-outage`}
                className="w-full h-48 bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500/40 resize-y"
                spellCheck={false}
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
              Cancel
            </button>
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
          </div>
        </div>
      </div>
    </div>
  );
};
