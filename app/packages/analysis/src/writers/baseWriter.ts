import type { AnalysisFileSystemPort, LoggerPort } from '../domain/ports.ts';
import type { SystemSchema } from '@archlens/core';
import { serializeSchemaToYaml } from '@archlens/core';

export class BaseWriter {
  constructor(
    protected fileSystem: AnalysisFileSystemPort,
    protected logger: LoggerPort
  ) {}

  async writeYaml(pathName: string, schema: SystemSchema): Promise<void> {
    const output = serializeSchemaToYaml(schema);

    const normalizedPath = pathName.replace(/\\/g, '/');
    const lastSlash = normalizedPath.lastIndexOf('/');
    if (lastSlash !== -1) {
      const parentDir = pathName.substring(0, lastSlash);
      if (parentDir && !this.fileSystem.exists(parentDir)) {
        this.fileSystem.mkdir(parentDir);
      }
    }

    await this.fileSystem.writeSchema(pathName, output);
  }
}
