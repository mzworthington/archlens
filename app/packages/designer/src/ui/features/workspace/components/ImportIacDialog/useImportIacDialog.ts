import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConflictResolution } from '@archlens/core';
import {
  defaultIacPathForKind,
  type IacSourceFile,
  type IacSourceKind,
} from '@archlens/core/import-iac';
import { useBlueprintStore } from '../../../../../application/store/store';

const KIND_OPTIONS: Array<{ value: IacSourceKind; label: string }> = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'terraform-hcl', label: 'Terraform HCL' },
  { value: 'terraform-json', label: 'Terraform JSON' },
  { value: 'pulumi-yaml', label: 'Pulumi YAML' },
  { value: 'pulumi-typescript', label: 'Pulumi TypeScript' },
  { value: 'pulumi-python', label: 'Pulumi Python' },
];

export function useImportIacDialog(isOpen: boolean, onClose: () => void) {
  const {
    previewIacImport,
    importIac,
    lastError,
    clearError,
    setNotification,
    setLayoutEngine,
    applyClientLayout,
  } = useBlueprintStore();

  const [sourceText, setSourceText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<IacSourceFile[]>([]);
  const [sourceKind, setSourceKind] = useState<IacSourceKind>('auto');
  const [parseError, setParseError] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSourceText('');
      setUploadedFiles([]);
      setSourceKind('auto');
      setParseError(null);
      setResolutions({});
      clearError();
    }
  }, [isOpen, clearError]);

  const sourceFiles = useMemo<IacSourceFile[]>(() => {
    if (uploadedFiles.length > 0) return uploadedFiles;
    if (!sourceText.trim()) return [];
    return [{ path: defaultIacPathForKind(sourceKind), content: sourceText }];
  }, [uploadedFiles, sourceText, sourceKind]);

  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewIacImport>> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (sourceFiles.length === 0) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    void (async () => {
      try {
        const result = await previewIacImport(sourceFiles, sourceKind);
        if (!cancelled) {
          setParseError(null);
          setPreview(result);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setParseError(e instanceof Error ? e.message : 'Failed to parse infrastructure source');
          setPreview(null);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceFiles, sourceKind, previewIacImport]);

  const handleFileUpload = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = await Promise.all(
      Array.from(fileList).map(async file => ({
        path: file.name,
        content: await file.text(),
      }))
    );
    setUploadedFiles(files);
    setSourceText('');
  }, []);

  const setConflictResolution = useCallback((entityRef: string, resolution: ConflictResolution) => {
    setResolutions(prev => ({ ...prev, [entityRef]: resolution }));
  }, []);

  const handleApply = useCallback(async () => {
    if (sourceFiles.length === 0) return;
    setApplying(true);
    try {
      const conflictResolutions = { ...resolutions };
      if (preview?.mergePlan.conflicts) {
        for (const c of preview.mergePlan.conflicts) {
          if (!conflictResolutions[c.entityRef]) {
            conflictResolutions[c.entityRef] = 'skip';
          }
        }
      }
      const success = await importIac(sourceFiles, conflictResolutions, sourceKind);
      if (success) {
        setLayoutEngine('elk');
        await applyClientLayout({ persistToSchema: true });
        setNotification({
          type: 'success',
          title: 'Import complete',
          message: 'Infrastructure merged and laid out with ELK. Commit via Pending Changes.',
        });
        onClose();
      }
    } finally {
      setApplying(false);
    }
  }, [
    sourceFiles,
    preview,
    resolutions,
    importIac,
    sourceKind,
    setLayoutEngine,
    applyClientLayout,
    setNotification,
    onClose,
  ]);

  const formatLabel = preview
    ? `${preview.parseResult.vendor} · ${preview.parseResult.format}`
    : null;

  const canApply = Boolean(preview && !parseError && sourceFiles.length > 0 && !previewLoading);

  return {
    sourceText,
    setSourceText,
    uploadedFiles,
    clearUploadedFiles: () => setUploadedFiles([]),
    sourceKind,
    setSourceKind,
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
    sourceFiles,
  };
}

export { KIND_OPTIONS };
