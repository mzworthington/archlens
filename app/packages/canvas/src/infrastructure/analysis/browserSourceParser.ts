import type { CodebaseParserPort } from '@archlens/analysis/ports';
import type { ParsedSourceFile } from '@archlens/analysis/types';
import { isTestSourcePath } from '@archlens/analysis/test-path';
import { throwIfAborted } from '@archlens/analysis/cancellation';
import { extractTsImports } from '../../application/analysis/extractTsImports';
import type { LiteScanSourceFile } from '../../application/analysis/liteScanTypes';
import { isLiteScanSourcePath } from '../../application/analysis/liteScanLimits';

/**
 * Browser CodebaseParserPort: maps a pre-walked source tree to ParsedSourceFile[].
 * Uses lightweight specifier extraction (adapter) — graph building stays in @archlens/analysis.
 */
export class BrowserSourceParser implements CodebaseParserPort {
  constructor(
    private readonly sources: readonly LiteScanSourceFile[],
    private readonly cwd: string = '/scan'
  ) {}

  /** Parse a single walked source with the lightweight extractor. */
  parseOne(source: LiteScanSourceFile): ParsedSourceFile | null {
    const relativePath = source.relativePath.replace(/\\/g, '/');
    if (!isLiteScanSourcePath(relativePath)) return null;

    const baseName =
      relativePath
        .split('/')
        .pop()
        ?.replace(/\.[^.]+$/, '') ?? relativePath;
    const { imports, reExports } = extractTsImports(source.content);

    return {
      filePath: `${this.cwd}/${relativePath}`.replace(/\/{2,}/g, '/'),
      relativePath,
      baseName,
      isTestFile: isTestSourcePath(relativePath),
      imports: imports.map(moduleSpecifier => ({ moduleSpecifier })),
      reExports: reExports.map(moduleSpecifier => ({ moduleSpecifier })),
      newExpressions: [],
      callExpressions: [],
    };
  }

  async parseSourceFiles(_globPattern: string, signal?: AbortSignal): Promise<ParsedSourceFile[]> {
    throwIfAborted(signal);
    const result: ParsedSourceFile[] = [];

    for (const source of this.sources) {
      throwIfAborted(signal);
      const parsed = this.parseOne(source);
      if (parsed) result.push(parsed);
    }

    return result;
  }
}
