import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';

export const ValidationDialog: React.FC = () => {
  const {
    isValidationOpen,
    setIsValidationOpen,
    validationResult,
    setFocusedCyclePath,
    selectNode,
  } = useBlueprintStore();

  if (!isValidationOpen) return null;

  const issues = validationResult.issues ?? [];
  const isValid = issues.length === 0;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="validation-dialog-title"
      data-testid="validation-dialog"
    >
      <div
        className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm cursor-pointer"
        onClick={() => setIsValidationOpen(false)}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl max-h-[min(85vh,600px)] flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {isValid ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <div>
                <h2 id="validation-dialog-title" className="text-base font-bold text-white">
                  Graph Validation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isValid
                    ? 'Architecture graph is clean and valid'
                    : 'Issues detected in diagram topology'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsValidationOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
              aria-label="Close validation dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isValid ? (
              <div className="w-full flex flex-col gap-2 bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 text-emerald-400 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <h3 className="font-semibold text-sm">Architecture Valid</h3>
                </div>
                <p className="text-xs text-emerald-500/80 leading-relaxed pl-7">
                  No cyclic loops, broken references, or invalid boundaries detected in the graph
                  structure.
                </p>
              </div>
            ) : (
              issues.map(issue => {
                const isCycle = issue.type === 'cycle';

                const handleGoToIssue = () => {
                  if (isCycle && issue.path && issue.path.length > 0) {
                    setFocusedCyclePath(issue.path);
                    selectNode(issue.path[0]);
                  }
                  setIsValidationOpen(false);
                };

                return (
                  <div
                    key={`${issue.type}-${issue.message}`}
                    className="w-full flex flex-col gap-3 bg-red-950/20 border border-red-900/30 rounded-xl p-4 text-red-400 text-xs transition-all duration-200"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-none mb-1">
                          {isCycle ? 'Circular Dependency' : 'Validation Alert'}
                        </h3>
                        <p className="text-xs text-red-400/80 leading-relaxed break-words">
                          {issue.message}
                        </p>
                        {issue.path && (
                          <div className="mt-2.5 font-mono text-[11px] bg-red-950/40 px-2.5 py-1.5 rounded border border-red-900/40 text-red-300 break-all leading-normal">
                            {issue.path.join(' ➔ ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end pt-1 border-t border-red-900/20">
                      <button
                        type="button"
                        onClick={handleGoToIssue}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-semibold font-mono transition cursor-pointer flex items-center gap-1.5"
                        data-testid="go-to-issue-button"
                      >
                        <span>Go to issue</span>
                        <span>➔</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
