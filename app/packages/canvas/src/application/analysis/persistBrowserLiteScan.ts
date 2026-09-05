import type { WorkspacePort } from '../../core';

export type YamlWorkspaceFile = { name: string; content: string };

export const BROWSER_LITE_TRACE_LENS_EMPTY =
  'This map came from a browser lite scan. Git hotspots are not available in this tab. Install the ArchLens CLI and scan locally if you need forensics.';

export const BROWSER_LITE_COMPLEXITY_EMPTY =
  'Browser lite scans are structure only. Git hotspots need the ArchLens CLI, not this tab.';

export function overlayWorkingYamlFiles(
  diskFiles: readonly YamlWorkspaceFile[],
  overlays: ReadonlyMap<string, string>
): YamlWorkspaceFile[] {
  return diskFiles.map(file => {
    const overlay = overlays.get(file.name);
    return overlay != null ? { name: file.name, content: overlay } : { ...file };
  });
}

export async function writeYamlFilesToWorkspace(
  port: Pick<WorkspacePort, 'writeFile'>,
  files: readonly YamlWorkspaceFile[]
): Promise<{ written: string[]; failed: string[] }> {
  const written: string[] = [];
  const failed: string[] = [];
  for (const file of files) {
    const ok = await port.writeFile(file.name, file.content);
    if (ok) written.push(file.name);
    else failed.push(file.name);
  }
  return { written, failed };
}

export function browserLiteTraceLensEmptyCopy(isBrowserLiteWorkspace: boolean): string | null {
  return isBrowserLiteWorkspace ? BROWSER_LITE_TRACE_LENS_EMPTY : null;
}

export function browserLiteComplexityEmptyCopy(isBrowserLiteWorkspace: boolean): string | null {
  return isBrowserLiteWorkspace ? BROWSER_LITE_COMPLEXITY_EMPTY : null;
}
