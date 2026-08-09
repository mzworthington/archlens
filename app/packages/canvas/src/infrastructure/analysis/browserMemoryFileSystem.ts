import type { AnalysisFileSystemPort } from '@archlens/analysis/ports';
import type { LiteScanSourceFile } from '../../application/analysis/liteScanTypes';

/**
 * In-memory AnalysisFileSystemPort seeded from a browser source walk.
 * Writers emit BlueprintSpec YAML into the same map for workspace open.
 */
export class BrowserMemoryFileSystem implements AnalysisFileSystemPort {
  readonly writtenFiles = new Map<string, string>();
  readonly textFiles = new Map<string, string>();
  readonly directories = new Map<string, Set<string>>();
  readonly createdDirs = new Set<string>();
  private readonly cwd: string;

  constructor(
    sources: readonly LiteScanSourceFile[],
    options: { cwd?: string; directoryName?: string } = {}
  ) {
    this.cwd = (options.cwd ?? '/scan').replace(/\/$/, '') || '/scan';
    this.ensureDir(this.cwd);

    for (const source of sources) {
      const relative = source.relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
      const abs = this.getAbsolutePath(this.cwd, relative);
      this.textFiles.set(abs, source.content);
      this.indexPath(abs);
      if (relative.endsWith('package.json')) {
        // listed via textFiles for readPackageJsonName
      }
    }
  }

  private ensureDir(dirPath: string): void {
    const normalized = dirPath.replace(/\\/g, '/').replace(/\/$/, '') || '/';
    this.createdDirs.add(normalized);
    if (!this.directories.has(normalized)) {
      this.directories.set(normalized, new Set());
    }
  }

  private indexPath(absPath: string): void {
    const normalized = absPath.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    let current = '';
    for (let i = 0; i < parts.length; i++) {
      const parent = current || '/';
      const name = parts[i]!;
      current = `${current}/${name}`;
      this.ensureDir(parent === '/' ? '/' : parent);
      this.directories.get(parent === '/' ? '/' : parent)!.add(name);
      if (i < parts.length - 1) {
        this.ensureDir(current);
      }
    }
  }

  async writeSchema(filePath: string, yamlContent: string): Promise<void> {
    const normalized = filePath.replace(/\\/g, '/');
    this.writtenFiles.set(normalized, yamlContent);
    this.textFiles.set(normalized, yamlContent);
    this.indexPath(normalized);
  }

  async readSchema(filePath: string): Promise<string> {
    const content = this.writtenFiles.get(filePath) ?? this.textFiles.get(filePath);
    if (content === undefined) {
      throw new Error(`File not found: ${filePath}`);
    }
    return content;
  }

  exists(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    return (
      this.writtenFiles.has(normalized) ||
      this.textFiles.has(normalized) ||
      this.directories.has(normalized) ||
      this.createdDirs.has(normalized)
    );
  }

  mkdir(dirPath: string): void {
    this.ensureDir(dirPath.replace(/\\/g, '/'));
  }

  unlink(filePath: string): void {
    const normalized = filePath.replace(/\\/g, '/');
    this.writtenFiles.delete(normalized);
    this.textFiles.delete(normalized);
  }

  readPackageJsonName(packageJsonPath: string): string | null {
    const text = this.textFiles.get(packageJsonPath.replace(/\\/g, '/'));
    if (!text) return null;
    try {
      const name = JSON.parse(text).name;
      return typeof name === 'string' ? name : null;
    } catch {
      return null;
    }
  }

  readText(filePath: string): string | null {
    return this.textFiles.get(filePath.replace(/\\/g, '/')) ?? null;
  }

  listDirectoryNames(dirPath: string): string[] {
    const normalized = dirPath.replace(/\\/g, '/').replace(/\/$/, '') || '/';
    const entries = this.directories.get(normalized);
    return entries ? Array.from(entries) : [];
  }

  getRelativePath(from: string, to: string): string {
    const fromNorm = from.replace(/\\/g, '/').replace(/\/$/, '');
    const toNorm = to.replace(/\\/g, '/');
    if (toNorm.startsWith(`${fromNorm}/`)) {
      return toNorm.slice(fromNorm.length + 1);
    }
    return toNorm.replace(/^\//, '');
  }

  getAbsolutePath(...parts: string[]): string {
    const joined = parts
      .filter(Boolean)
      .join('/')
      .replace(/\\/g, '/')
      .replace(/\/{2,}/g, '/');
    if (joined.startsWith('/')) return joined;
    return `${this.cwd}/${joined}`.replace(/\/{2,}/g, '/');
  }

  getCurrentWorkingDirectory(): string {
    return this.cwd;
  }

  /** Collect written BlueprintSpec YAML as workspace files (paths relative to output root). */
  collectWrittenYamlFiles(outputRoot: string): Array<{ name: string; content: string }> {
    const root = outputRoot.replace(/\\/g, '/').replace(/\/$/, '');
    const files: Array<{ name: string; content: string }> = [];
    for (const [abs, content] of this.writtenFiles) {
      if (!abs.endsWith('.yaml') && !abs.endsWith('.yml')) continue;
      const name = abs.startsWith(`${root}/`) ? abs.slice(root.length + 1) : abs.replace(/^\//, '');
      files.push({ name, content });
    }
    return files;
  }
}
