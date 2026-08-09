import type { CodebaseParserPort } from '@archlens/analysis/ports';
import type { ParsedSourceFile } from '@archlens/analysis/types';
import { isTestSourcePath } from '@archlens/analysis/test-path';
import { throwIfAborted } from '@archlens/analysis/cancellation';
import { extractTsImports } from '../../application/analysis/extractTsImports';
import type { LiteScanSourceFile } from '../../application/analysis/liteScanTypes';
import { LITE_SCAN_EXTENSIONS } from '../../application/analysis/liteScanLimits';

function extensionOf(path: string): string {
  const idx = path.lastIndexOf('.');
  return idx >= 0 ? path.slice(idx).toLowerCase() : '';
}

/**
 * Browser CodebaseParserPort: maps a pre-walked source tree to ParsedSourceFile[].
 * Uses lightweight specifier extraction (adapter) — graph building stays in @archlens/analysis.
 */
export class BrowserSourceParser implements CodebaseParserPort {
  constructor(
    private readonly sources: readonly LiteScanSourceFile[],
    private readonly cwd: string = '/scan'
  ) {}

  async parseSourceFiles(_globPattern: string, signal?: AbortSignal): Promise<ParsedSourceFile[]> {
    throwIfAborted(signal);
    const result: ParsedSourceFile[] = [];

    for (const source of this.sources) {
      throwIfAborted(signal);
      const relativePath = source.relativePath.replace(/\\/g, '/');
      if (!LITE_SCAN_EXTENSIONS.has(extensionOf(relativePath))) continue;

      const baseName =
        relativePath
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, '') ?? relativePath;
      const { imports, reExports } = extractTsImports(source.content);

      result.push({
        filePath: `${this.cwd}/${relativePath}`.replace(/\/{2,}/g, '/'),
        relativePath,
        baseName,
        isTestFile: isTestSourcePath(relativePath),
        imports: imports.map(moduleSpecifier => ({ moduleSpecifier })),
        reExports: reExports.map(moduleSpecifier => ({ moduleSpecifier })),
        newExpressions: [],
        callExpressions: [],
      });
    }

    return result;
  }
}
