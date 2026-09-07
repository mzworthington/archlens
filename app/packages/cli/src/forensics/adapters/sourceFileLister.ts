import { createSourcePathFilter } from '../../analysis/adapters/pathFilter/sourcePathFilter';
import { throwIfAborted } from '@archlens/analysis/cancellation';
import type { ForensicsOptions } from '../domain/options';
import type { SourceFileListerPort } from '../domain/ports';
import { listFilesForGlob } from './sourceFileWalk';

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
