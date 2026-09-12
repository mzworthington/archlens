import { throwIfAborted } from '../domain/cancellation';
import { countLocAndSloc, extractRelativeImports } from '@archlens/core/forensics';
import type { GitCommit } from '@archlens/core/forensics';
import { normalizeFilePath } from './attachForensics';
import type { ForensicsOptions } from './options';
import type {
  ComplexityAnalyzerPort,
  GitHistoryPort,
  ImportGraphPort,
  SourceFileListerPort,
} from './ports';
import type { StructuralMetrics } from './report';

const CONTROL_FLOW = /\b(?:if|else|elif|for|while|switch|case|catch|except|when|match)\b/g;

export function estimateControlFlowComplexity(text: string): number {
  const matches = text.match(CONTROL_FLOW);
  return 1 + (matches?.length ?? 0);
}

export class ContentFileLister implements SourceFileListerPort {
  constructor(private readonly paths: readonly string[]) {}

  async listSourceFiles(_options: ForensicsOptions, signal?: AbortSignal): Promise<string[]> {
    throwIfAborted(signal);
    return [...this.paths];
  }
}

export class ContentComplexityAdapter implements ComplexityAnalyzerPort {
  constructor(private readonly files: ReadonlyMap<string, string>) {}

  async analyze(
    paths: string[],
    options: ForensicsOptions,
    signal?: AbortSignal
  ): Promise<StructuralMetrics[]> {
    throwIfAborted(signal);
    const skipAst = new Set((options.skipAstPaths ?? []).map(p => normalizeFilePath(p)));
    const results: StructuralMetrics[] = [];

    for (const path of paths) {
      throwIfAborted(signal);
      const normalized = normalizeFilePath(path);
      const text = this.files.get(normalized);
      if (text == null) continue;
      const { loc, sloc } = countLocAndSloc(text);
      const complexity = skipAst.has(normalized) ? 0 : estimateControlFlowComplexity(text);
      results.push({ path: normalized, complexity, loc, sloc });
    }

    return results;
  }
}

export class ContentImportGraphAdapter implements ImportGraphPort {
  constructor(private readonly files: ReadonlyMap<string, string>) {}

  async extractImports(
    paths: string[],
    _options: ForensicsOptions,
    signal?: AbortSignal
  ): Promise<Map<string, string[]>> {
    throwIfAborted(signal);
    const result = new Map<string, string[]>();

    for (const path of paths) {
      throwIfAborted(signal);
      const normalized = normalizeFilePath(path);
      const text = this.files.get(normalized);
      if (text == null) continue;
      const specifiers = extractRelativeImports(normalized, text);
      if (specifiers.length > 0) result.set(normalized, specifiers);
    }

    return result;
  }
}

export class StaticGitHistoryAdapter implements GitHistoryPort {
  constructor(private readonly commits: readonly GitCommit[]) {}

  async loadHistory(
    _rootPath: string,
    _options: Pick<ForensicsOptions, 'sinceDays'>,
    signal?: AbortSignal
  ): Promise<GitCommit[]> {
    throwIfAborted(signal);
    return [...this.commits];
  }
}
