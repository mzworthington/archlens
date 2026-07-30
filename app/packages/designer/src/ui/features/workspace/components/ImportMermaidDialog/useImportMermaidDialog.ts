import { useCallback, useEffect, useState } from 'react';
import type { ConflictResolution } from '@archlens/core';
import { extractMermaidFromMarkdown } from '@archlens/core/import-mermaid';
import { useBlueprintStore } from '../../../../../application/store/store';

const FORMAT_LABELS: Record<string, string> = {
  flowchart: 'Flowchart',
  'c4-context': 'C4 Context',
  'c4-container': 'C4 Container',
  'c4-component': 'C4 Component',
  unknown: 'Unknown',
};

export function useImportMermaidDialog(isOpen: boolean, onClose: () => void) {
  const {
    previewMermaidImport,
    importMermaid,
    lastError,
    clearError,
    setNotification,
    setLayoutEngine,
    applyClientLayout,
    setMermaidEnrichBannerOpen,
  } = useBlueprintStore();

  const [mermaidText, setMermaidText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setMermaidText('');
      setParseError(null);
      setResolutions({});
      clearError();
    }
  }, [isOpen, clearError]);

  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewMermaidImport>> | null>(
    null
  );
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!mermaidText.trim()) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    void (async () => {
      try {
        const source = extractMermaidFromMarkdown(mermaidText);
        const result = await previewMermaidImport(source);
        if (!cancelled) {
          setParseError(null);
          setPreview(result);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setParseError(e instanceof Error ? e.message : 'Failed to parse Mermaid');
          setPreview(null);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mermaidText, previewMermaidImport]);

  const handleFileUpload = useCallback(async (file: File) => {
    const content = await file.text();
    setMermaidText(content);
  }, []);

  const setConflictResolution = useCallback((entityRef: string, resolution: ConflictResolution) => {
    setResolutions(prev => ({ ...prev, [entityRef]: resolution }));
  }, []);

  const handleApply = useCallback(async () => {
    if (!mermaidText.trim()) return;
    setApplying(true);
    try {
      const source = extractMermaidFromMarkdown(mermaidText);
      const conflictResolutions = { ...resolutions };
      if (preview?.mergePlan.conflicts) {
        for (const c of preview.mergePlan.conflicts) {
          if (!conflictResolutions[c.entityRef]) {
            conflictResolutions[c.entityRef] = 'skip';
          }
        }
      }
      const success = await importMermaid(source, conflictResolutions);
      if (success) {
        setLayoutEngine('elk');
        await applyClientLayout({ persistToSchema: true });
        setMermaidEnrichBannerOpen(true);
        setNotification({
          type: 'success',
          title: 'Import complete',
          message: 'Mermaid diagram merged and laid out with ELK. Commit via Pending Changes.',
        });
        onClose();
      }
    } finally {
      setApplying(false);
    }
  }, [
    mermaidText,
    preview,
    resolutions,
    importMermaid,
    setLayoutEngine,
    applyClientLayout,
    setNotification,
    setMermaidEnrichBannerOpen,
    onClose,
  ]);

  const formatLabel = preview ? (FORMAT_LABELS[preview.parseResult.format] ?? 'Unknown') : null;

  const canApply = Boolean(preview && !parseError && mermaidText.trim() && !previewLoading);

  return {
    mermaidText,
    setMermaidText,
    parseError: parseError || lastError,
    preview,
    previewLoading,
    formatLabel,
    resolutions,
    setConflictResolution,
    handleFileUpload,
    handleApply,
    applying,
    canApply,
  };
}
