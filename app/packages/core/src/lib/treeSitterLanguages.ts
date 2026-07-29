/** Language keys shipped via tree-sitter-wasms (CLI scan + designer highlighting). */
export const TREE_SITTER_WASMS_PACKAGE_LANGUAGES = [
  'typescript',
  'tsx',
  'javascript',
  'python',
  'go',
  'java',
  'c_sharp',
] as const;

/** Additional grammars vendored outside tree-sitter-wasms (designer highlighting only). */
export const TREE_SITTER_HCL_PACKAGE_LANGUAGES = ['terraform', 'hcl'] as const;

export const TREE_SITTER_WASM_LANGUAGES = [
  ...TREE_SITTER_WASMS_PACKAGE_LANGUAGES,
  ...TREE_SITTER_HCL_PACKAGE_LANGUAGES,
] as const;

export type TreeSitterWasmLanguage = (typeof TREE_SITTER_WASM_LANGUAGES)[number];

export function wasmFileName(langKey: string): string {
  return `tree-sitter-${langKey}.wasm`;
}

/** Map a repo-relative filepath to a tree-sitter language key, if supported. */
export function extensionToTreeSitterLanguage(filePath: string): TreeSitterWasmLanguage | null {
  const normalized = filePath.replace(/\\/g, '/');
  const dot = normalized.lastIndexOf('.');
  if (dot === -1) return null;

  const ext = normalized.slice(dot).toLowerCase();
  switch (ext) {
    case '.ts':
      return 'typescript';
    case '.tsx':
      return 'tsx';
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'javascript';
    case '.py':
      return 'python';
    case '.go':
      return 'go';
    case '.java':
      return 'java';
    case '.cs':
      return 'c_sharp';
    case '.tf':
    case '.tfvars':
      return 'terraform';
    case '.hcl':
      return 'hcl';
    default:
      return null;
  }
}
