import { DEFAULT_BLUEPRINTS_FOLDER } from '../../copy';

/** Relative folder name. `..` and absolute paths stay on the default. */
export function blueprintsFolderName(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_BLUEPRINTS_FOLDER;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.includes('\\')) return DEFAULT_BLUEPRINTS_FOLDER;
  const parts = trimmed.split('/');
  if (parts.some(part => part.length === 0 || part === '.' || part === '..')) {
    return DEFAULT_BLUEPRINTS_FOLDER;
  }
  return trimmed;
}
