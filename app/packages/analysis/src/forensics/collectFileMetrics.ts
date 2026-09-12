import { ForensicAnalyzer, type RunForensicsInput } from './analyzer';
import { normalizeFilePath } from './attachForensics';
import { DEFAULT_FORENSICS_OPTIONS, mergeForensicsOptions } from './options';
import type { ForensicAnalyzerPorts } from './ports';
import type { FileMetrics } from './types';

export async function collectFileMetricsFromPorts(
  ports: ForensicAnalyzerPorts,
  input: RunForensicsInput
): Promise<Map<string, FileMetrics>> {
  const options = mergeForensicsOptions(DEFAULT_FORENSICS_OPTIONS, input.options);
  const analyzer = new ForensicAnalyzer(ports);
  const report = await analyzer.run(input);
  const byPath = new Map<string, FileMetrics>();
  for (const file of report.files) {
    byPath.set(normalizeFilePath(file.path), {
      ...file,
      sinceDays: options.sinceDays,
      ...(options.shortChurnDays > 0 && options.shortChurnDays < options.sinceDays
        ? { shortChurnDays: options.shortChurnDays }
        : {}),
    });
  }
  return byPath;
}
