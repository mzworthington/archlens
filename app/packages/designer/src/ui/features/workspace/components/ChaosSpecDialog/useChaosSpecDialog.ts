import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSchemaEntityRef } from '@archlens/core';
import {
  buildChaosSpecDocument,
  parseChaosSpecFromYaml,
  serializeChaosSpecToYaml,
  validateChaosSpecForDiagram,
} from '@archlens/core/resilience';
import { BrowserFileSystemAdapter } from '../../../../../infrastructure/fileSystem/fileSync';
import { useBlueprintStore } from '../../../../../application/store/store';

export type ChaosSpecDialogMode = 'import' | 'export';

function chaosSpecFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'chaos-scenario'}.yaml`;
}

function buildExportYamlFromStore(): string {
  const state = useBlueprintStore.getState();
  const diagramRef = getSchemaEntityRef(state.schema);
  const doc = buildChaosSpecDocument({
    diagramRef,
    name: state.chaosSpecMetadata?.name ?? `${state.schema.name} chaos scenario`,
    description: state.chaosSpecMetadata?.description,
    faults: state.resilienceFaults,
    safeguards: state.resilienceSafeguards,
    monteCarlo: state.resilienceMonteCarlo,
  });
  return serializeChaosSpecToYaml(doc);
}

export function useChaosSpecDialog(
  isOpen: boolean,
  mode: ChaosSpecDialogMode,
  onModeChange: (mode: ChaosSpecDialogMode) => void,
  onClose: () => void
) {
  const schema = useBlueprintStore(s => s.schema);
  const resilienceFaults = useBlueprintStore(s => s.resilienceFaults);
  const applyChaosSpecYaml = useBlueprintStore(s => s.applyChaosSpecYaml);
  const runResilienceSimulation = useBlueprintStore(s => s.runResilienceSimulation);
  const setNotification = useBlueprintStore(s => s.setNotification);

  const [yamlText, setYamlText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const activeDiagramRef = useMemo(() => getSchemaEntityRef(schema), [schema]);
  const canExport = resilienceFaults.length > 0;

  const refreshExportYaml = useCallback(() => {
    if (!canExport) {
      setYamlText('');
      return;
    }
    setYamlText(buildExportYamlFromStore());
    setParseError(null);
  }, [canExport]);

  useEffect(() => {
    if (!isOpen) {
      setYamlText('');
      setParseError(null);
      return;
    }

    if (mode === 'export') {
      refreshExportYaml();
    } else {
      setYamlText('');
      setParseError(null);
    }
  }, [isOpen, mode, refreshExportYaml]);

  const preview = useMemo(() => {
    if (!yamlText.trim()) return null;
    try {
      const document = parseChaosSpecFromYaml(yamlText);
      const validationError = validateChaosSpecForDiagram(document, schema, activeDiagramRef);
      return { document, validationError };
    } catch (err) {
      return {
        document: null,
        validationError: err instanceof Error ? err.message : 'Invalid ChaosSpec YAML',
      };
    }
  }, [yamlText, schema, activeDiagramRef]);

  useEffect(() => {
    if (!yamlText.trim()) {
      setParseError(null);
      return;
    }
    setParseError(preview?.validationError ?? null);
  }, [yamlText, preview]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      const content = await file.text();
      setYamlText(content);
      onModeChange('import');
    },
    [onModeChange]
  );

  const handleApply = useCallback(
    async (runAfterApply: boolean) => {
      if (!yamlText.trim()) return;
      setApplying(true);
      try {
        const error = applyChaosSpecYaml(yamlText);
        if (error) {
          setParseError(error);
          return;
        }

        setNotification({
          type: 'success',
          title: 'ChaosSpec loaded',
          message: runAfterApply
            ? 'Scenario applied and simulation started.'
            : 'Scenario applied. Click Simulate to run it.',
        });

        onClose();

        if (runAfterApply) {
          runResilienceSimulation();
        }
      } finally {
        setApplying(false);
      }
    },
    [yamlText, applyChaosSpecYaml, runResilienceSimulation, setNotification, onClose]
  );

  const handleCopy = useCallback(async () => {
    if (!yamlText.trim()) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(yamlText);
      setNotification({
        type: 'success',
        title: 'Copied',
        message: 'ChaosSpec YAML copied to clipboard.',
      });
    } finally {
      setCopying(false);
    }
  }, [yamlText, setNotification]);

  const handleDownload = useCallback(async () => {
    if (!preview?.document) return;
    setDownloading(true);
    try {
      const saved = await BrowserFileSystemAdapter.saveSchema(
        yamlText,
        chaosSpecFileName(preview.document.metadata.name)
      );
      if (saved) {
        setNotification({
          type: 'success',
          title: 'ChaosSpec saved',
          message: `Downloaded ${chaosSpecFileName(preview.document.metadata.name)}.`,
        });
      }
    } finally {
      setDownloading(false);
    }
  }, [yamlText, preview, setNotification]);

  const canApply = Boolean(preview?.document && !parseError && yamlText.trim());
  const canCopyOrDownload = Boolean(preview?.document && !parseError && yamlText.trim());

  return {
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
  };
}
