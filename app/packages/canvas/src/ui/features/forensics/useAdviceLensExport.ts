import { useCallback, useState } from 'react';
import type { EstateRecommendationsReport } from '../../../application/recommendations/buildEstateRecommendations';
import {
  ADVICELENS_DEFAULT_EXPORT_FORMAT,
  adviceLensExportFilename,
  buildAdviceLensExportText,
} from '../../../application/recommendations/exportAdviceLensArtifact';
import { useBlueprintStore } from '../../../application/store/store';

export function useAdviceLensExport(report: EstateRecommendationsReport | null) {
  const fileSystemPort = useBlueprintStore(s => s.fileSystemPort);
  const setNotification = useBlueprintStore(s => s.setNotification);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const canExport = Boolean(report && report.summary.diagramCount > 0);
  const filename = adviceLensExportFilename(ADVICELENS_DEFAULT_EXPORT_FORMAT);

  const handleCopy = useCallback(async () => {
    if (!report) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(
        buildAdviceLensExportText(report, ADVICELENS_DEFAULT_EXPORT_FORMAT)
      );
      setNotification({
        type: 'success',
        title: 'Copied',
        message: 'AdviceLens YAML report copied to clipboard.',
      });
    } finally {
      setCopying(false);
    }
  }, [report, setNotification]);

  const handleDownload = useCallback(async () => {
    if (!report) return;
    setDownloading(true);
    try {
      const saved = await fileSystemPort.saveSchema(
        buildAdviceLensExportText(report, ADVICELENS_DEFAULT_EXPORT_FORMAT),
        filename
      );
      if (saved) {
        setNotification({
          type: 'success',
          title: 'AdviceLens saved',
          message: `Downloaded ${filename}.`,
        });
      }
    } finally {
      setDownloading(false);
    }
  }, [report, fileSystemPort, setNotification, filename]);

  return {
    canExport,
    copying,
    downloading,
    handleCopy,
    handleDownload,
  };
}
