import fs from 'node:fs';
import path from 'node:path';
import { CodebaseAnalyzer } from '@archlens/analysis/analyzer';
import { IacAnalyzer } from '@archlens/analysis/iac';
import { DEFAULT_ANALYSIS_OPTIONS } from '@archlens/analysis/options';
import type { AnalysisFileSystemPort, LoggerPort } from '@archlens/analysis/ports';
import type { ParsedSourceFile } from '@archlens/analysis/types';

/** Blueprint files from the shared codebase and infrastructure analyzers. */
export async function analyzeWorkspace(input: {
  root: string;
  outputDir: string;
  files: readonly ParsedSourceFile[];
}): Promise<{ path: string; content: string }[]> {
  const fileSystem = new CaptureFileSystem(input.root);
  const logger = silentLogger;
  const parser = {
    parseSourceFiles: async () => [...input.files],
  };
  const analyzer = new CodebaseAnalyzer({
    parser,
    fileSystem,
    logger,
    analysisOptions: DEFAULT_ANALYSIS_OPTIONS,
  });
  const contextName = workspaceName(input.root);
  const discovered = await analyzer.runAnalysis(contextName, input.outputDir, '**/*');
  await new IacAnalyzer({ fileSystem, logger, parser }).run(contextName, input.outputDir, {
    scanRoot: input.root,
    discoveredSystems: discovered,
  });
  return [...fileSystem.written.entries()].map(([path, content]) => ({ path, content }));
}

function workspaceName(root: string): string {
  const folder =
    root
      .replace(/[/\\]+$/, '')
      .split(/[/\\]/)
      .pop() || 'workspace';
  return folder.toLowerCase();
}

const silentLogger: LoggerPort = {
  info() {},
  warn() {},
  error() {},
};

/** Records analyzer writes and answers the directory questions the analyzers ask. */
class CaptureFileSystem implements AnalysisFileSystemPort {
  readonly written = new Map<string, string>();
  private readonly directories = new Map<string, Set<string>>();
  private readonly readDisk: boolean;

  constructor(private readonly cwd: string) {
    this.readDisk = fs.existsSync(cwd);
    this.ensureDir(cwd);
  }

  async writeSchema(filePath: string, yamlContent: string): Promise<void> {
    const normalized = normalize(filePath);
    this.written.set(normalized, yamlContent);
    this.index(normalized);
  }

  async readSchema(filePath: string): Promise<string> {
    const content = this.readText(filePath);
    if (content === null) throw new Error(`File not found: ${filePath}`);
    return content;
  }

  exists(filePath: string): boolean {
    const normalized = normalize(filePath);
    if (this.written.has(normalized) || this.directories.has(normalized)) return true;
    return this.readDisk && fs.existsSync(normalized);
  }

  mkdir(dirPath: string): void {
    this.ensureDir(normalize(dirPath));
  }

  unlink(filePath: string): void {
    this.written.delete(normalize(filePath));
  }

  readPackageJsonName(packageJsonPath: string): string | null {
    const text = this.readText(packageJsonPath);
    if (!text) return null;
    try {
      const name = JSON.parse(text).name;
      return typeof name === 'string' && name.length > 0 ? name : null;
    } catch {
      return null;
    }
  }

  readText(filePath: string): string | null {
    const normalized = normalize(filePath);
    const written = this.written.get(normalized);
    if (written !== undefined) return written;
    if (!this.readDisk) return null;
    try {
      if (!fs.statSync(normalized).isFile()) return null;
      return fs.readFileSync(normalized, 'utf8');
    } catch {
      return null;
    }
  }

  listDirectoryNames(dirPath: string): string[] {
    const names = new Set(this.directories.get(normalize(dirPath)) ?? []);
    if (this.readDisk) {
      try {
        for (const name of fs.readdirSync(normalize(dirPath))) names.add(name);
      } catch {
        // The analyzers walk directories that are not on disk yet.
      }
    }
    return [...names];
  }

  getRelativePath(from: string, to: string): string {
    return path.relative(normalize(from), normalize(to)).replaceAll('\\', '/');
  }

  getAbsolutePath(...parts: string[]): string {
    const cleaned = parts.filter(part => part.length > 0).map(part => part.replace(/\\/g, '/'));
    if (cleaned.length === 0) return this.cwd;
    const joined = cleaned[0]?.startsWith('/')
      ? cleaned.join('/')
      : [this.cwd, ...cleaned].join('/');
    return normalize(joined);
  }

  getCurrentWorkingDirectory(): string {
    return this.cwd;
  }

  private ensureDir(dirPath: string): void {
    const normalized = normalize(dirPath);
    if (!this.directories.has(normalized)) this.directories.set(normalized, new Set());
    this.index(normalized);
  }

  private index(absPath: string): void {
    const parts = normalize(absPath).split('/').filter(Boolean);
    let current = '';
    for (const name of parts) {
      const parent = current || '/';
      current = `${current}/${name}`;
      if (!this.directories.has(parent)) this.directories.set(parent, new Set());
      this.directories.get(parent)?.add(name);
      if (!this.directories.has(current) && current !== normalize(absPath)) {
        this.directories.set(current, new Set());
      }
    }
  }
}

function normalize(filePath: string): string {
  const slash = filePath.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  return slash.length > 1 ? slash.replace(/\/$/, '') : slash;
}
