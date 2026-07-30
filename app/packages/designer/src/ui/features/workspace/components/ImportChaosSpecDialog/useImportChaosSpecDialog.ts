import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSchemaEntityRef } from '@archlens/core';
import { parseChaosSpecFromYaml, validateChaosSpecForDiagram } from '@archlens/core/resilience';
import { useBlueprintStore } from '../../../../../application/store/store';

export function useImportChaosSpecDialog(isOpen: boolean, onClose: () => void) {
  const schema = useBlueprintStore(s => s.schema);
  const applyChaosSpecYaml = useBlueprintStore(s => s.applyChaosSpecYaml);
  const runResilienceSimulation = useBlueprintStore(s => s.runResilienceSimulation);
  const setNotification = useBlueprintStore(s => s.setNotification);

  const [yamlText, setYamlText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const activeDiagramRef = useMemo(() => getSchemaEntityRef(schema), [schema]);

  useEffect(() => {
    if (!isOpen) {
      setYamlText('');
      setParseError(null);
    }
  }, [isOpen]);

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

  const handleFileUpload = useCallback(async (file: File) => {
    const content = await file.text();
    setYamlText(content);
  }, []);

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

  const canApply = Boolean(preview?.document && !parseError && yamlText.trim());

  return {
    yamlText,
    setYamlText,
    parseError,
    preview,
    activeDiagramRef,
    handleFileUpload,
    handleApply,
    applying,
    canApply,
  };
}
