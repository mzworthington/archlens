import { parse as parseHcl } from '@cruglobal/js-hcl2';
import type { TerraformFormat } from './types';

export function detectFormat(source: string, forced?: TerraformFormat | 'auto'): TerraformFormat {
  if (forced === 'hcl' || forced === 'json') return forced;
  const trimmed = source.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  return 'hcl';
}

export function parseDocument(source: string, format: TerraformFormat): Record<string, unknown> {
  if (format === 'json') {
    const parsed: unknown = JSON.parse(source);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Terraform JSON root must be an object');
    }
    return parsed as Record<string, unknown>;
  }
  return parseHcl(source) as Record<string, unknown>;
}
