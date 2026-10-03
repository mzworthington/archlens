import {
  collectFileMetricsFromPorts,
  ContentComplexityAdapter,
  ContentFileLister,
  ContentImportGraphAdapter,
  estimateControlFlowComplexity,
  StaticGitHistoryAdapter,
  type ComplexityAnalyzerPort,
  type FileMetrics,
  type ForensicsOptions,
  type StructuralMetrics,
} from '@archlens/analysis/forensics';
import Parser from 'web-tree-sitter';
import { throwIfAborted } from '@archlens/analysis/cancellation';
import { extensionToTreeSitterLanguage } from '@archlens/core';
import {
  countLocAndSloc,
  summarizeFunctionComplexitySlices,
  type CyclomaticAstNode,
  type CyclomaticLanguage,
  type GitCommit,
} from '@archlens/core/forensics';
import { initTreeSitter, loadTreeSitterLanguageForFile } from '../parsing/treeSitterClient';
import { isLiteScanSourcePath } from './liteScanLimits';
import type { LiteScanSourceFile } from './liteScanTypes';
import { BROWSER_SCAN_CWD } from './runBrowserAnalysis';

function sourceMapFromLiteScan(sources: readonly LiteScanSourceFile[]): Map<string, string> {
  const files = new Map<string, string>();
  for (const source of sources) {
    const path = source.relativePath.replace(/\\/g, '/');
    if (!isLiteScanSourcePath(path)) continue;
    files.set(path, source.content);
  }
  return files;
}

export type BrowserScanComplexity = 'keywords' | 'syntax-tree';

export type SyntaxTreeComplexity = Pick<
  StructuralMetrics,
  'complexity' | 'complexityPeak' | 'cognitiveComplexity' | 'functionCount'
>;

export type MeasureSyntaxTree = (
  path: string,
  text: string
) => Promise<SyntaxTreeComplexity | null>;

class SyntaxTreeComplexityAdapter implements ComplexityAnalyzerPort {
  constructor(
    private readonly files: ReadonlyMap<string, string>,
    private readonly measure: MeasureSyntaxTree
  ) {}

  async analyze(
    paths: string[],
    _options: ForensicsOptions,
    signal?: AbortSignal
  ): Promise<StructuralMetrics[]> {
    throwIfAborted(signal);
    const results: StructuralMetrics[] = [];
    for (const path of paths) {
      throwIfAborted(signal);
      const text = this.files.get(path);
      if (text == null) continue;
      const { loc, sloc } = countLocAndSloc(text);
      const measured = await this.measure(path, text);
      const complexity = measured?.complexity ?? estimateControlFlowComplexity(text);
      results.push({
        path,
        complexity,
        loc,
        sloc,
        ...(measured?.complexityPeak !== undefined
          ? { complexityPeak: measured.complexityPeak }
          : {}),
        ...(measured?.cognitiveComplexity !== undefined
          ? { cognitiveComplexity: measured.cognitiveComplexity }
          : {}),
        ...(measured?.functionCount !== undefined ? { functionCount: measured.functionCount } : {}),
      });
    }
    return results;
  }
}

export async function collectBrowserFileMetrics(args: {
  sources: readonly LiteScanSourceFile[];
  commits: readonly GitCommit[];
  signal?: AbortSignal;
  complexity?: BrowserScanComplexity;
  measureSyntaxTree?: MeasureSyntaxTree;
}): Promise<Map<string, FileMetrics>> {
  const files = sourceMapFromLiteScan(args.sources);
  const paths = [...files.keys()];
  if (paths.length === 0) return new Map();

  const complexity =
    args.complexity === 'syntax-tree'
      ? new SyntaxTreeComplexityAdapter(
          files,
          args.measureSyntaxTree ?? measureBrowserSyntaxTreeComplexity
        )
      : new ContentComplexityAdapter(files);

  return collectFileMetricsFromPorts(
    {
      fileLister: new ContentFileLister(paths),
      complexity,
      gitHistory: new StaticGitHistoryAdapter(args.commits),
      importGraph: new ContentImportGraphAdapter(files),
      reporters: [],
    },
    {
      rootPath: BROWSER_SCAN_CWD,
      explicitPaths: paths,
      signal: args.signal,
    }
  );
}

type WalkNode = {
  type: string;
  text: string;
  childCount: number;
  child(index: number): WalkNode | null;
  childForFieldName(name: string): WalkNode | null;
};

const FUNCTION_ROOT_TYPES: Record<CyclomaticLanguage, Set<string>> = {
  typescript: new Set([
    'function_declaration',
    'generator_function',
    'method_definition',
    'arrow_function',
  ]),
  tsx: new Set([
    'function_declaration',
    'generator_function',
    'method_definition',
    'arrow_function',
  ]),
  javascript: new Set([
    'function_declaration',
    'generator_function',
    'method_definition',
    'arrow_function',
  ]),
  python: new Set(['function_definition']),
  go: new Set(['function_declaration', 'method_declaration']),
  java: new Set(['method_declaration', 'constructor_declaration']),
  c_sharp: new Set([
    'method_declaration',
    'constructor_declaration',
    'local_function_statement',
    'destructor_declaration',
  ]),
};

function cyclomaticLanguageForPath(relativePath: string): CyclomaticLanguage | null {
  const langKey = extensionToTreeSitterLanguage(relativePath);
  if (!langKey || langKey === 'terraform' || langKey === 'hcl') return null;
  return langKey;
}

function nodeOperatorText(node: WalkNode): string | undefined {
  if (node.type !== 'binary_expression') return undefined;
  return node.childForFieldName('operator')?.text;
}

function collectCyclomaticAstNodes(root: WalkNode): CyclomaticAstNode[] {
  const nodes: CyclomaticAstNode[] = [];
  const walk = (node: WalkNode) => {
    nodes.push({ type: node.type, operatorText: nodeOperatorText(node) });
    for (let i = 0; i < node.childCount; i += 1) {
      const child = node.child(i);
      if (child) walk(child);
    }
  };
  walk(root);
  return nodes;
}

function collectFunctionComplexitySlices(
  root: WalkNode,
  language: CyclomaticLanguage
): CyclomaticAstNode[][] {
  const roots = FUNCTION_ROOT_TYPES[language];
  const slices: CyclomaticAstNode[][] = [];
  const collectBody = (fnNode: WalkNode): CyclomaticAstNode[] => {
    const nodes: CyclomaticAstNode[] = [];
    const walk = (node: WalkNode) => {
      if (node !== fnNode && roots.has(node.type)) return;
      nodes.push({ type: node.type, operatorText: nodeOperatorText(node) });
      for (let i = 0; i < node.childCount; i += 1) {
        const child = node.child(i);
        if (child) walk(child);
      }
    };
    walk(fnNode);
    return nodes;
  };
  const walk = (node: WalkNode) => {
    if (roots.has(node.type)) slices.push(collectBody(node));
    for (let i = 0; i < node.childCount; i += 1) {
      const child = node.child(i);
      if (child) walk(child);
    }
  };
  walk(root);
  return slices;
}

async function measureBrowserSyntaxTreeComplexity(
  path: string,
  text: string
): Promise<SyntaxTreeComplexity | null> {
  const language = cyclomaticLanguageForPath(path);
  if (!language) return null;
  if (!(await initTreeSitter())) return null;
  const loaded = await loadTreeSitterLanguageForFile(path);
  if (!loaded) return null;

  const parser = new Parser();
  let tree: Parser.Tree | null = null;
  try {
    parser.setLanguage(loaded.language);
    tree = parser.parse(text);
    const root = tree.rootNode as unknown as WalkNode;
    const summary = summarizeFunctionComplexitySlices(
      language,
      collectFunctionComplexitySlices(root, language),
      collectCyclomaticAstNodes(root)
    );
    return {
      complexity: summary.complexityPeak,
      ...(summary.functionCount > 0
        ? {
            complexityPeak: summary.complexityPeak,
            cognitiveComplexity: summary.cognitivePeak > 0 ? summary.cognitivePeak : undefined,
            functionCount: summary.functionCount,
          }
        : {}),
    };
  } catch {
    return null;
  } finally {
    tree?.delete();
  }
}
