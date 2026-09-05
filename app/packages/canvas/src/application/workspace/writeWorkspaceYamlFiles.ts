import type { WorkspacePort } from '../../core';

export type WriteWorkspaceYamlFilesResult = { ok: true } | { ok: false; failedPath: string };

export async function writeWorkspaceYamlFiles(
  port: Pick<WorkspacePort, 'writeFile'>,
  files: Array<{ name: string; content: string }>
): Promise<WriteWorkspaceYamlFilesResult> {
  for (const file of files) {
    const written = await port.writeFile(file.name, file.content);
    if (!written) {
      return { ok: false, failedPath: file.name };
    }
  }
  return { ok: true };
}

export function downloadScanYamlFileName(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').split('/').filter(Boolean).join('__');
}
