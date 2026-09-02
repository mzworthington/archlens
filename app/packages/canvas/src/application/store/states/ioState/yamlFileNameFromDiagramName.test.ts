import { describe, expect, it } from 'vitest';
import { yamlFileNameFromDiagramName } from './yamlFileNameFromDiagramName';

describe('yamlFileNameFromDiagramName', () => {
  it('turns a display name into a yaml filename', () => {
    expect(yamlFileNameFromDiagramName('Checkout Service')).toBe('checkout_service.yaml');
  });

  it('falls back when the name is empty', () => {
    expect(yamlFileNameFromDiagramName('   ')).toBe('blueprint.yaml');
  });
});
