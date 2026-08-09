import type { AnalysisFileSystemPort } from './ports.ts';
import type { AnalysisOptions } from './analysisOptions.ts';
import {
  createStructuralPathFilter,
  type SourcePathFilter,
} from '../pathFilter/structuralPathFilter.ts';
import type { CsprojFile } from './csharpDependencies.ts';

function parseGlobBaseDir(globPattern: string, fileSystem: AnalysisFileSystemPort): string {
  const cwd = fileSystem.getCurrentWorkingDirectory();
  const normalized = globPattern.replace(/\\/g, '/');
  const baseDir = normalized.split('**')[0]?.replace(/\/$/, '') ?? '';
  if (baseDir) {
    return fileSystem.getAbsolutePath(cwd, baseDir);
  }
  return fileSystem.getAbsolutePath(cwd, 'src');
}

function collectCsprojFiles(
  dir: string,
  pathFilter: SourcePathFilter,
  results: CsprojFile[],
  fileSystem: AnalysisFileSystemPort
) {
  if (!fileSystem.exists(dir)) return;

  for (const entry of fileSystem.listDirectoryNames(dir)) {
    const filePath = fileSystem.getAbsolutePath(dir, entry);
    const relativePath = fileSystem.getRelativePath(
      fileSystem.getCurrentWorkingDirectory(),
      filePath
    );

    if (pathFilter.shouldSkip(relativePath)) continue;

    const lower = entry.toLowerCase();
    if (lower.endsWith('.csproj')) {
      const content = fileSystem.readText(filePath);
      if (content != null) {
        results.push({ relativePath: relativePath.replace(/\\/g, '/'), content });
      }
      continue;
    }

    const childAbs = fileSystem.getAbsolutePath(dir, entry);
    const hasChildren = fileSystem.listDirectoryNames(childAbs).length > 0;
    if (hasChildren) {
      collectCsprojFiles(childAbs, pathFilter, results, fileSystem);
    }
  }
}

export function discoverCsprojFiles(
  globPattern: string,
  fileSystem: AnalysisFileSystemPort,
  options: Pick<AnalysisOptions, 'ignore' | 'include'> = { ignore: [], include: [] }
): CsprojFile[] {
  const pathFilter = createStructuralPathFilter(options);
  const baseDir = parseGlobBaseDir(globPattern, fileSystem);
  const results: CsprojFile[] = [];
  collectCsprojFiles(baseDir, pathFilter, results, fileSystem);
  return results;
}
