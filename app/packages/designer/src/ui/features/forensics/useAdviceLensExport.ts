import { useCallback, useState } from 'react';
import type { EstateRecommendationsReport } from '../../../application/recommendations/buildEstateRecommendations';
import {
  ADVICELENS_EXPORT_FILENAME,
  buildAdviceLensExportJson,
} from '../../../application/recommendations/exportAdviceLensArtifact';
import { useBlueprintStore } from '../../../application/store/store';

export function useAdviceLensExport(report: EstateRecommendationsReport | null) {
  const fileSystemPort = useBlueprintStore(s => s.fileSystemPort);
  const setNotification = useBlueprintStore(s => s.setNotification);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const canExport = Boolean(report && report.summary.diagramCount > 0);

  const handleCopy = useCallback(async () => {
    if (!report) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(buildAdviceLensExportJson(report));
      setNotification({
        type: 'success',
        title: 'Copied',
        message: 'AdviceLens JSON report copied to clipboard.',
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
        buildAdviceLensExportJson(report),
        ADVICELENS_EXPORT_FILENAME
      );
      if (saved) {
        setNotification({
          type: 'success',
          title: 'AdviceLens saved',
          message: `Downloaded ${ADVICELENS_EXPORT_FILENAME}.`,
        });
      }
    } finally {
      setDownloading(false);
    }
  }, [report, fileSystemPort, setNotification]);

  return {
    canExport,
    copying,
    downloading,
    handleCopy,
    handleDownload,
  };
}
