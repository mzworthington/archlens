import React, { lazy, Suspense } from 'react';
import { Copy, Check, AlertCircle, CheckCircle2, GitMerge } from 'lucide-react';
import { useCodeViewer } from './useCodeViewer';

const MermaidPreview = lazy(() =>
  import('../../../../components/MermaidPreview').then(m => ({ default: m.MermaidPreview }))
);

/** Schema explorer body - rendered inside the tabbed left workspace panel. */
export const CodeViewerContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    copied,
    mermaidMode,
    setMermaidMode,
    yamlText,
    setYamlText,
    jsonText,
    setJsonText,
    availableTabs,
    getCodeContent,
    handleCopy,
    handleSaveYaml,
    handleSaveJson,
    handleOpenMermaidImport,
    lastError,
    clearError,
  } = useCodeViewer();

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex shrink-0 border-b border-slate-900 bg-slate-950/60 p-1">
        {availableTabs.map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              clearError();
            }}
            className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg capitalize transition cursor-pointer ${
              activeTab === tab
                ? 'bg-accent/15 border border-accent/30 text-accent font-bold shadow-[0_0_8px_color-mix(in_srgb,var(--color-accent)_15%,transparent)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'mermaid' ? 'Mermaid.js' : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4 min-h-0">
        {activeTab === 'yaml' || activeTab === 'json' ? (
          <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {activeTab === 'yaml'
                  ? 'Edit current system schema using YAML format:'
                  : 'Edit current system schema using JSON format:'}
              </p>

              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-navy border border-accent/20 hover:border-accent/50 hover:bg-accent/5 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] font-semibold shadow-md cursor-pointer z-10"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              value={activeTab === 'yaml' ? yamlText : jsonText}
              onChange={e => {
                if (activeTab === 'yaml') {
                  setYamlText(e.target.value);
                } else {
                  setJsonText(e.target.value);
                }
              }}
              placeholder={
                activeTab === 'yaml'
                  ? 'name: My System\nversion: 1.0.0...'
                  : '{\n  "name": "My System",\n  "version": "1.0.0"...\n}'
              }
              className="flex-1 bg-navy/60 border border-accent/15 focus:border-accent focus:shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_10%,transparent)] rounded-xl p-3 text-xs font-mono text-white focus:outline-none resize-none transition duration-200"
            />

            {lastError && (
              <div className="flex items-start gap-2 bg-red-950/20 border border-red-900/30 rounded-xl p-2.5 text-red-400 text-xs">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <span className="break-words w-full">{lastError}</span>
              </div>
            )}

            <button
              onClick={activeTab === 'yaml' ? handleSaveYaml : handleSaveJson}
              className="w-full flex items-center justify-center gap-2 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/40 hover:border-accent rounded-lg py-2 text-xs font-bold shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_15%,transparent)] hover:shadow-[0_0_15px_color-mix(in_srgb,var(--color-accent)_35%,transparent)] transition cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Apply {activeTab.toUpperCase()} Changes
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden relative group">
            <div className="flex items-center justify-between mb-3 shrink-0">
              {activeTab === 'mermaid' ? (
                <div className="flex bg-navy/80 p-0.5 rounded-lg border border-accent/15">
                  <button
                    onClick={() => setMermaidMode('preview')}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                      mermaidMode === 'preview'
                        ? 'bg-accent/15 border border-accent/30 text-accent font-bold shadow-[0_0_8px_color-mix(in_srgb,var(--color-accent)_15%,transparent)]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setMermaidMode('code')}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                      mermaidMode === 'code'
                        ? 'bg-accent/15 border border-accent/30 text-accent font-bold shadow-[0_0_8px_color-mix(in_srgb,var(--color-accent)_15%,transparent)]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Code
                  </button>
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenMermaidImport}
                  className="px-3 py-1.5 rounded-lg bg-navy border border-accent/20 hover:border-accent/50 hover:bg-accent/5 text-accent hover:text-cyan-300 transition flex items-center gap-1.5 text-xs font-semibold shadow-md cursor-pointer z-10"
                  title="Import Mermaid diagram into the active schema"
                  id="import-mermaid-action"
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>Import</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-navy border border-accent/20 hover:border-accent/50 hover:bg-accent/5 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold shadow-md cursor-pointer z-10"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {activeTab === 'mermaid' && mermaidMode === 'preview' ? (
              <Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center text-xs font-mono text-slate-500">
                    Loading preview…
                  </div>
                }
              >
                <MermaidPreview code={getCodeContent()} />
              </Suspense>
            ) : (
              <pre className="flex-1 bg-navy/60 border border-accent/10 rounded-xl p-4 overflow-auto text-xs font-mono text-slate-300 leading-relaxed select-all">
                <code>{getCodeContent()}</code>
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
