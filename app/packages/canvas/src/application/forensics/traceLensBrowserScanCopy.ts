import type { BrowserGitHistoryStatus } from '../analysis/browserGitStatus';

export const TRACE_LENS_BROWSER_SCAN_NO_GIT =
  'This folder has no git history, so TraceLens hotspots are empty. Pick a git checkout, or install the ArchLens CLI for watch mode and CI publish.';

export const TRACE_LENS_BROWSER_SCAN_GIT_FAILED =
  'Could not read git history in this tab. TraceLens hotspots are unavailable. Install the ArchLens CLI, or retry with a folder that includes `.git`.';

export const TRACE_LENS_FOLDER_MISSING_FORENSICS =
  'Blueprints are loaded but have no TraceLens blocks. Re-scan with git enabled (`archlens` default) or run `archlens enrich --git` on existing YAML.';

export function traceLensMissingForensicsCopy(
  isBrowserLiteWorkspace: boolean,
  gitStatus: BrowserGitHistoryStatus | null = null
): string {
  if (!isBrowserLiteWorkspace) return TRACE_LENS_FOLDER_MISSING_FORENSICS;
  if (gitStatus === 'failed') return TRACE_LENS_BROWSER_SCAN_GIT_FAILED;
  return TRACE_LENS_BROWSER_SCAN_NO_GIT;
}

export function browserScanReadyMessage(args: {
  sourceFileCount: number;
  iacFileCount: number;
  truncatedNote: string;
  gitStatus: BrowserGitHistoryStatus;
}): string {
  const iac = args.iacFileCount > 0 ? ` and ${args.iacFileCount} IaC file(s)` : '';
  const git =
    args.gitStatus === 'included'
      ? ' TraceLens git hotspots are included.'
      : args.gitStatus === 'failed'
        ? ' Git history could not be read in this tab.'
        : ' This folder has no git history, so TraceLens hotspots are empty.';
  return `Loaded ${args.sourceFileCount} source file(s)${iac}.${git}${args.truncatedNote} Save the map to a folder, or keep it in memory. Install the ArchLens CLI for watch mode and CI publish.`;
}
