import { describe, it, expect } from 'vitest';
import {
  extensionToTreeSitterLanguage,
  wasmFileName,
  TREE_SITTER_WASM_LANGUAGES,
} from './treeSitterLanguages';

describe('treeSitterLanguages', () => {
  it('maps common source extensions to language keys', () => {
    expect(extensionToTreeSitterLanguage('src/app.tsx')).toBe('tsx');
    expect(extensionToTreeSitterLanguage('lib\\service.ts')).toBe('typescript');
    expect(extensionToTreeSitterLanguage('main.py')).toBe('python');
    expect(extensionToTreeSitterLanguage('Program.cs')).toBe('c_sharp');
    expect(extensionToTreeSitterLanguage('README')).toBeNull();
    expect(extensionToTreeSitterLanguage('data.yaml')).toBeNull();
  });

  it('builds wasm filenames for all shipped languages', () => {
    for (const lang of TREE_SITTER_WASM_LANGUAGES) {
      expect(wasmFileName(lang)).toBe(`tree-sitter-${lang}.wasm`);
    }
  });
});
