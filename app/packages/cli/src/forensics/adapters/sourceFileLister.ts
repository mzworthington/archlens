import { createSourcePathFilter } from '../../analysis/adapters/pathFilter/sourcePathFilter.ts';
import { throwIfAborted } from '../../analysis/domain/cancellation.ts';
import type { ForensicsOptions } from '../domain/options.ts';
import type { SourceFileListerPort } from '../domain/ports.ts';
import { listFilesForGlob } from './sourceFileWalk.ts';

export class SourceFileListerAdapter implements SourceFileListerPort {
  constructor(private readonly cwd: string = process.cwd()) {}

  async listSourceFiles(options: ForensicsOptions, signal?: AbortSignal): Promise<string[]> {
    throwIfAborted(signal);

    const pathFilter = createSourcePathFilter(this.cwd, {
      ignore: options.ignore,
      include: options.include,
    });

    return listFilesForGlob(this.cwd, options.glob, relativePath =>
      pathFilter.shouldSkip(relativePath)
    );
  }
}
