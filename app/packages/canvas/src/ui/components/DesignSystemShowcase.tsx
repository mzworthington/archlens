import React, { useState } from 'react';
import { AppHeader } from './AppHeader';
import { DESIGN_SYSTEM_SECTIONS, type DesignSystemSectionId } from './designSystemSections';
import { IdentitySection } from './designSystem/IdentitySection';
import { TokensSection } from './designSystem/TokensSection';
import { AssetsSection } from './designSystem/AssetsSection';
import { ComponentsSection } from './designSystem/ComponentsSection';
import { SandboxSection } from './designSystem/SandboxSection';

type DesignSystemShowcaseProps = {
  embedded?: boolean;
  activeTab?: DesignSystemSectionId;
  onTabChange?: (tab: DesignSystemSectionId) => void;
};

export const DesignSystemShowcase: React.FC<DesignSystemShowcaseProps> = ({
  embedded = false,
  activeTab: activeTabProp,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<DesignSystemSectionId>('identity');
  const activeTab = activeTabProp ?? internalTab;
  const setActiveTab = (tab: DesignSystemSectionId) => {
    onTabChange?.(tab);
    if (activeTabProp === undefined) setInternalTab(tab);
  };
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [sandboxNodeType, setSandboxNodeType] = useState<
    'person' | 'software-system' | 'web-app' | 'database' | 'microservice'
  >('web-app');
  const [sandboxTitle, setSandboxTitle] = useState('Payment Service');
  const [sandboxDesc, setSandboxDesc] = useState(
    'Processes credit cards and generates receipts via gRPC.'
  );
  const [sandboxStatus, setSandboxStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');

  return (
    <div
      className={
        embedded
          ? 'min-w-0 flex flex-col text-slate-100'
          : 'fixed inset-0 z-[100] flex flex-col h-dvh max-h-dvh bg-[#040914]/98 blueprint-grid text-slate-100 overflow-y-auto animate-fade-in pb-safe'
      }
    >
      {!embedded ? (
        <AppHeader
          sticky
          badge="DESIGN SYSTEM"
          subtitle="Visual language for ArchLens: tokens, marketing patterns and canvas UI."
        />
      ) : null}

      {!embedded ? (
        <div className="md:hidden border-b border-[#00f0ff]/10 bg-[#061125]/60 backdrop-blur-sm sticky z-40 top-[73px]">
          <div className="flex gap-2 items-center p-3 overflow-x-auto scrollbar-none min-w-0">
            {DESIGN_SYSTEM_SECTIONS.map(item => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-mono whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/30'
                      : 'text-slate-500 hover:text-slate-200 bg-transparent border-transparent hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        className={
          embedded
            ? 'min-w-0'
            : 'max-w-6xl w-full mx-auto px-4 md:px-8 py-8 flex-1 flex flex-col md:flex-row md:items-start gap-8'
        }
      >
        {!embedded ? (
          <aside
            className="hidden md:block w-full md:w-56 shrink-0"
            aria-label="Design system sections"
          >
            <div className="sticky top-28 space-y-6 text-sm">
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#00f0ff]">
                  Design system
                </p>
                <ul className="space-y-1">
                  {DESIGN_SYSTEM_SECTIONS.map(item => {
                    const active = activeTab === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full text-left block rounded-md px-2 py-1.5 transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#00f0ff]/10 text-[#00f0ff]'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </aside>
        ) : null}

        <main
          className={
            embedded
              ? 'min-w-0 w-full'
              : 'min-w-0 w-full bg-[#061125]/40 border border-[#00f0ff]/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm'
          }
        >
          {activeTab === 'identity' && (
            <IdentitySection embedded={embedded} setActiveTab={setActiveTab} />
          )}

          {activeTab === 'tokens' && (
            <TokensSection copiedId={copiedId} copyToClipboard={copyToClipboard} />
          )}

          {activeTab === 'assets' && (
            <AssetsSection
              copiedId={copiedId}
              copyToClipboard={copyToClipboard}
              handleDownload={handleDownload}
            />
          )}

          {activeTab === 'components' && <ComponentsSection />}

          {activeTab === 'sandbox' && (
            <SandboxSection
              sandboxNodeType={sandboxNodeType}
              setSandboxNodeType={setSandboxNodeType}
              sandboxTitle={sandboxTitle}
              setSandboxTitle={setSandboxTitle}
              sandboxDesc={sandboxDesc}
              setSandboxDesc={setSandboxDesc}
              sandboxStatus={sandboxStatus}
              setSandboxStatus={setSandboxStatus}
            />
          )}
        </main>
      </div>
    </div>
  );
};
