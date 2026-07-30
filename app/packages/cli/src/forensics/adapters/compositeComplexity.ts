import type { LoggerPort } from '../../analysis/domain/ports.ts';
import { throwIfAborted } from '../../analysis/domain/cancellation.ts';
import type { ForensicsOptions } from '../domain/options.ts';
import type { ComplexityAnalyzerPort } from '../domain/ports.ts';
import type { StructuralMetrics } from '../domain/types.ts';
import { LocOnlyComplexityAdapter } from './locOnlyComplexity.ts';
import { TsMorphComplexityAdapter } from './tsMorphComplexity.ts';

const TS_EXTENSIONS = new Set(['.ts', '.tsx']);

function extensionOf(relativePath: string): string {
  const dot = relativePath.lastIndexOf('.');
  return dot >= 0 ? relativePath.slice(dot).toLowerCase() : '';
}

/**
 * Routes TypeScript files to cyclomatic analysis; all other languages get LOC-only metrics.
 */
export class CompositeComplexityAdapter implements ComplexityAnalyzerPort {
  private readonly tsAdapter: TsMorphComplexityAdapter;
  private readonly locAdapter: LocOnlyComplexityAdapter;

  constructor(logger: LoggerPort, cwd: string = process.cwd()) {
    this.tsAdapter = new TsMorphComplexityAdapter(logger, cwd);
    this.locAdapter = new LocOnlyComplexityAdapter(logger, cwd);
  }

  async analyze(
    paths: string[],
    options: ForensicsOptions,
    signal?: AbortSignal
  ): Promise<StructuralMetrics[]> {
    throwIfAborted(signal);

    const tsPaths: string[] = [];
    const otherPaths: string[] = [];
    for (const p of paths) {
      if (TS_EXTENSIONS.has(extensionOf(p))) {
        tsPaths.push(p);
      } else {
        otherPaths.push(p);
      }
    }

    const [tsMetrics, otherMetrics] = await Promise.all([
      this.tsAdapter.analyze(tsPaths, options, signal),
      this.locAdapter.analyze(otherPaths, options, signal),
    ]);

    return [...tsMetrics, ...otherMetrics];
  }
}
