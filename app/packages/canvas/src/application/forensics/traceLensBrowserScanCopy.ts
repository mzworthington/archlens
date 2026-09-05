export const TRACE_LENS_BROWSER_SCAN_EMPTY =
  'This tab is a structure-only browser scan. Git TraceLens is not available here. Install the ArchLens CLI for forensics.';

export const TRACE_LENS_FOLDER_MISSING_FORENSICS =
  'Blueprints are loaded but have no TraceLens blocks. Re-scan with git enabled (`archlens` default) or run `archlens enrich --git` on existing YAML.';

export function traceLensMissingForensicsCopy(isBrowserLiteWorkspace: boolean): string {
  return isBrowserLiteWorkspace
    ? TRACE_LENS_BROWSER_SCAN_EMPTY
    : TRACE_LENS_FOLDER_MISSING_FORENSICS;
}
