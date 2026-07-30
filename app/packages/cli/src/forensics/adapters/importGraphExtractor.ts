import fs from 'fs';
import path from 'path';
import { extractRelativeImports } from '@archlens/core/forensics';
import { throwIfAborted } from '../../analysis/domain/cancellation.ts';
import type { ForensicsOptions } from '../domain/options.ts';
import type { ImportGraphPort } from '../domain/ports.ts';

export class RegexImportGraphAdapter implements ImportGraphPort {
  constructor(private readonly cwd: string = process.cwd()) {}

  async extractImports(
    paths: string[],
    _options: ForensicsOptions,
    signal?: AbortSignal
  ): Promise<Map<string, string[]>> {
    throwIfAborted(signal);
    const result = new Map<string, string[]>();

    for (const relativePath of paths) {
      throwIfAborted(signal);
      const absolute = path.resolve(this.cwd, relativePath);
      if (!fs.existsSync(absolute)) continue;

      try {
        const text = fs.readFileSync(absolute, 'utf8');
        const specifiers = extractRelativeImports(relativePath, text);
        if (specifiers.length > 0) {
          result.set(relativePath.replace(/\\/g, '/'), specifiers);
        }
      } catch {
        // Skip unreadable files
      }
    }

    return result;
  }
}
