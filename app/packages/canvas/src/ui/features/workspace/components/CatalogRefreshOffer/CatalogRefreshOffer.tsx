import React, { useEffect, useId, useRef, useState } from 'react';
import { remoteCatalogRefreshOffer } from '../../../../../application/catalog/remoteCatalogRefresh';
import { BUNDLED_WORKSPACE_NAME } from '../../../../../application/store/samplesWorkspace';
import { useBlueprintStore } from '../../../../../application/store/store';
import { fetchRemoteCatalogLatestPointer } from '../../../../../infrastructure/fileSystem/remoteCatalogWorkspace';
import { resolveRemoteCatalogBaseUrl } from '../../../../../infrastructure/fileSystem/sampleWorkspaceLoader';

/** How often an open remote sample workspace asks whether a newer snapshot exists. */
const REMOTE_CATALOG_REFRESH_POLL_MS = 5_000;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Banner when the published catalog moved on. Refresh loads that snapshot
 * on the canvas. Drafts stay until the user confirms.
 */
export const CatalogRefreshOffer: React.FC = () => {
  const usesRemoteCatalog = useBlueprintStore(s => s.usesRemoteCatalog);
  const loadedRevision = useBlueprintStore(s => s.remoteCatalogRevision);
  const refreshRemoteCatalog = useBlueprintStore(s => s.refreshRemoteCatalog);
  const [latestRevision, setLatestRevision] = useState<string | null>(null);
  const [dismissedRevision, setDismissedRevision] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!usesRemoteCatalog) return;
    const baseUrl = resolveRemoteCatalogBaseUrl();
    if (!baseUrl) return;

    let cancelled = false;
    const tick = () => {
      void fetchRemoteCatalogLatestPointer({
        baseUrl,
        workspaceName: BUNDLED_WORKSPACE_NAME,
      })
        .then(pointer => {
          if (!cancelled) setLatestRevision(pointer.revision);
        })
        .catch(() => {
          if (!cancelled) setLatestRevision(null);
        });
    };

    tick();
    const timer = window.setInterval(tick, REMOTE_CATALOG_REFRESH_POLL_MS);
    window.addEventListener('focus', tick);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', tick);
    };
  }, [usesRemoteCatalog, loadedRevision]);

  useEffect(() => {
    if (!confirmOpen) return;
    const container = confirmRef.current;
    if (!container) return;
    const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    items[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setConfirmOpen(false);
        if (latestRevision) setDismissedRevision(latestRevision);
        return;
      }
      if (event.key !== 'Tab' || items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const focused = document.activeElement;
      if (event.shiftKey && focused === first) {
        event.preventDefault();
        event.stopPropagation();
        last.focus();
      } else if (!event.shiftKey && focused === last) {
        event.preventDefault();
        event.stopPropagation();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmOpen, latestRevision]);

  const offer = remoteCatalogRefreshOffer({
    loadedRevision,
    latestRevision,
    dismissedRevision,
  });

  if (!usesRemoteCatalog || offer === 'hidden') return null;

  const keepCurrent = () => {
    if (latestRevision) setDismissedRevision(latestRevision);
    setConfirmOpen(false);
  };

  const requestRefresh = async () => {
    const result = await refreshRemoteCatalog(false);
    if (result === 'needs-confirm') setConfirmOpen(true);
  };

  const confirmRefresh = async () => {
    setConfirmOpen(false);
    await refreshRemoteCatalog(true);
  };

  return (
    <>
      <div
        role="status"
        aria-label="Newer snapshot available"
        className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-[#00f0ff]/20 bg-[#061018] px-4 py-2"
        data-testid="catalog-refresh-offer"
      >
        <p className="text-xs font-semibold text-[#00f0ff]">Newer snapshot available</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void requestRefresh()}
            className="rounded-md bg-[#00f0ff]/15 px-3 py-1.5 text-[11px] font-semibold text-[#00f0ff] border border-[#00f0ff]/30 cursor-pointer"
          >
            Refresh in place
          </button>
          <button
            type="button"
            onClick={keepCurrent}
            className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-slate-300 border border-slate-700 cursor-pointer"
          >
            Keep what I have
          </button>
        </div>
      </div>
      {confirmOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Dismiss"
            className="fixed inset-0 bg-[#020617]/80 border-0 p-0 cursor-pointer"
            onClick={keepCurrent}
          />
          <div
            ref={confirmRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-2xl"
          >
            <h2 id={titleId} className="text-sm font-semibold text-slate-100">
              Replace draft changes?
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Refreshing loads the new catalog snapshot and drops draft changes on this canvas.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={keepCurrent}
                className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-slate-300 border border-slate-700 cursor-pointer"
              >
                Keep what I have
              </button>
              <button
                type="button"
                onClick={() => void confirmRefresh()}
                className="rounded-md bg-[#00f0ff]/15 px-3 py-1.5 text-[11px] font-semibold text-[#00f0ff] border border-[#00f0ff]/30 cursor-pointer"
              >
                Refresh in place
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
