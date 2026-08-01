import type { WorkspacePort } from '../../core';
import { GOLDEN_PATHS_SAMPLE_NAME } from '../../application/store/goldenPathsSample';

const SAMPLE_ROOT_MARKER = 'samples/golden-paths/';

const sampleYamlModules = import.meta.glob<string>(
  '../../../samples/golden-paths/**/*.{yaml,yml}',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  }
);

function globKeyToSamplePath(globKey: string): string {
  const markerIdx = globKey.lastIndexOf(SAMPLE_ROOT_MARKER);
  if (markerIdx < 0) {
    const parts = globKey.split('/');
    return parts[parts.length - 1] ?? globKey;
  }
  return globKey.slice(markerIdx + SAMPLE_ROOT_MARKER.length);
}

const sampleYamlByPath = new Map<string, string>(
  Object.entries(sampleYamlModules).map(([key, content]) => [globKeyToSamplePath(key), content])
);

/**
 * Read-only workspace over checked-in `samples/golden-paths/` YAML.
 * Entity refs come from schema metadata — no path inference.
 */
export const BundledSampleWorkspaceAdapter: WorkspacePort = {
  selectDirectory: async () => true,
  readFile: async (relativePath: string): Promise<string> => {
    const content = sampleYamlByPath.get(relativePath);
    if (!content) {
      throw new Error(`Sample blueprint not found: ${relativePath}`);
    }
    return content;
  },
  writeFile: async () => false,
  getDirectoryName: () => GOLDEN_PATHS_SAMPLE_NAME,
  hasPermission: async () => false,
  readDirectoryFiles: async (): Promise<Array<{ name: string; content: string }>> => {
    return [...sampleYamlByPath.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, content]) => ({ name, content }));
  },
};
