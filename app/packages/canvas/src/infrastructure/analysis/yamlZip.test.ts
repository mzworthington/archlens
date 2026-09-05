import { describe, expect, it, vi } from 'vitest';
import { createStoreZip, triggerNamedDownload } from './yamlZip';

describe('yamlZip', () => {
  it('packs YAML files as an uncompressed zip with a PK header', () => {
    const zip = createStoreZip([
      { name: 'context.yaml', content: 'name: Demo\n' },
      { name: 'svc/container.yaml', content: 'name: Svc\n' },
    ]);

    const text = new TextDecoder().decode(zip);
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
    expect(text).toContain('context.yaml');
    expect(text).toContain('svc/container.yaml');
    expect(text).toContain('name: Demo\n');
    expect(text).toContain('name: Svc\n');
  });

  it('triggers a named browser download', () => {
    const click = vi.fn();
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(tagName => {
      const el = originalCreate(tagName);
      if (tagName === 'a') el.click = click;
      return el;
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:zip'),
      revokeObjectURL: vi.fn(),
    });

    triggerNamedDownload('scan-map.zip', new Blob(['pk']));

    expect(click).toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
