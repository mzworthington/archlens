import { describe, expect, it, vi } from 'vitest';
import {
  BROWSER_LITE_COMPLEXITY_EMPTY,
  BROWSER_LITE_TRACE_LENS_EMPTY,
  browserLiteComplexityEmptyCopy,
  browserLiteTraceLensEmptyCopy,
  overlayWorkingYamlFiles,
  writeYamlFilesToWorkspace,
} from './persistBrowserLiteScan';

describe('persistBrowserLiteScan', () => {
  it('overlays working YAML onto the scan files without mutating the originals', () => {
    const disk = [
      { name: 'context.yaml', content: 'name: Scan\n' },
      { name: 'svc/container.yaml', content: 'name: Svc\n' },
    ];
    const overlays = new Map([['context.yaml', 'name: Edited\n']]);

    const next = overlayWorkingYamlFiles(disk, overlays);

    expect(next).toEqual([
      { name: 'context.yaml', content: 'name: Edited\n' },
      { name: 'svc/container.yaml', content: 'name: Svc\n' },
    ]);
    expect(disk[0]?.content).toBe('name: Scan\n');
  });

  it('writes every YAML path through the workspace port and reports failures', async () => {
    const writeFile = vi.fn(async (path: string) => path !== 'bad.yaml');

    const result = await writeYamlFilesToWorkspace({ writeFile }, [
      { name: 'context.yaml', content: 'ok\n' },
      { name: 'bad.yaml', content: 'nope\n' },
    ]);

    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(result.written).toEqual(['context.yaml']);
    expect(result.failed).toEqual(['bad.yaml']);
  });

  it('does not tell TraceLens that git hotspots exist in a browser-scan tab', () => {
    expect(browserLiteTraceLensEmptyCopy(true)).toBe(BROWSER_LITE_TRACE_LENS_EMPTY);
    expect(browserLiteTraceLensEmptyCopy(true)).not.toMatch(/hotspots exist/i);
    expect(browserLiteComplexityEmptyCopy(true)).toBe(BROWSER_LITE_COMPLEXITY_EMPTY);
    expect(browserLiteTraceLensEmptyCopy(false)).toBeNull();
    expect(browserLiteComplexityEmptyCopy(false)).toBeNull();
  });
});
