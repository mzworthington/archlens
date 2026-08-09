export interface ParsedImport {
  moduleSpecifier: string;
}

export interface ParsedNewExpression {
  className: string;
}

export interface ParsedSourceFile {
  filePath: string;
  relativePath: string;
  baseName: string;
  isTestFile: boolean;
  imports: ParsedImport[];
  /** `export … from '…'` module specifiers (barrel re-exports). */
  reExports?: ParsedImport[];
  newExpressions: ParsedNewExpression[];
  callExpressions: string[];
  namespaces?: string[];
}
