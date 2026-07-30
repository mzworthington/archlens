import fs from 'fs';
import path from 'path';
import type { LoggerPort } from '../../analysis/domain/ports.ts';
import { throwIfAborted } from '../../analysis/domain/cancellation.ts';
import type { ForensicsOptions } from '../domain/options.ts';
import type { ComplexityAnalyzerPort } from '../domain/ports.ts';
import type { StructuralMetrics } from '../domain/types.ts';
import { countLocAndSloc } from './tsMorphComplexity.ts';

/**
 * LOC-only structural metrics for languages without a dedicated complexity adapter.
 * Complexity is reported as 0.
 */
export class LocOnlyComplexityAdapter implements ComplexityAnalyzerPort {
  constructor(
    private readonly logger: LoggerPort,
    private readonly cwd: string = process.cwd()
  ) {}

  async analyze(
    paths: string[],
    _options: ForensicsOptions,
    signal?: AbortSignal
  ): Promise<StructuralMetrics[]> {
    throwIfAborted(signal);
    const results: StructuralMetrics[] = [];

    for (const relativePath of paths) {
      throwIfAborted(signal);
      const absolute = path.resolve(this.cwd, relativePath);
      try {
        if (!fs.existsSync(absolute)) {
          this.logger.warn('Skipping missing file for LOC analysis', { path: relativePath });
          continue;
        }
        const text = fs.readFileSync(absolute, 'utf8');
        const { loc, sloc } = countLocAndSloc(text);
        results.push({
          path: relativePath.replace(/\\/g, '/'),
          complexity: 0,
          loc,
          sloc,
        });
      } catch (error) {
        this.logger.warn('Failed to analyze LOC metrics; continuing', {
          path: relativePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }
}
