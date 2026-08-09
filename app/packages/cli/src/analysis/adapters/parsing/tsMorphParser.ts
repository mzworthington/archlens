import { Project, SyntaxKind, ImportDeclaration, NewExpression, CallExpression } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import type { CodebaseParserPort } from '@archlens/analysis/ports';
import type { ParsedSourceFile } from '@archlens/analysis';
import type { AnalysisOptions } from '@archlens/analysis';
import { isTestSourcePath } from '@archlens/analysis';
import { createSourcePathFilter } from '../pathFilter/sourcePathFilter.ts';
import { throwIfAborted } from '@archlens/analysis/cancellation';

export class TsMorphParserAdapter implements CodebaseParserPort {
  constructor(
    private options: Pick<AnalysisOptions, 'ignore' | 'include'> = { ignore: [], include: [] }
  ) {}

  async parseSourceFiles(globPattern: string, signal?: AbortSignal): Promise<ParsedSourceFile[]> {
    throwIfAborted(signal);

    const tsConfigPath = path.resolve(process.cwd(), 'tsconfig.json');
    const project = new Project(
      fs.existsSync(tsConfigPath)
        ? {
            tsConfigFilePath: tsConfigPath,
            skipAddingFilesFromTsConfig: true,
          }
        : {}
    );

    const pathFilter = createSourcePathFilter(process.cwd(), this.options);
    const resolvedPattern = path.resolve(process.cwd(), globPattern);
    project.addSourceFilesAtPaths([resolvedPattern]);

    const sourceFiles = project.getSourceFiles().filter(sf => {
      const relativePath = path.relative(process.cwd(), sf.getFilePath());
      return !pathFilter.shouldSkip(relativePath);
    });
    const result: ParsedSourceFile[] = [];

    for (const sourceFile of sourceFiles) {
      throwIfAborted(signal);

      const filePath = sourceFile.getFilePath();
      const relativePath = path.relative(process.cwd(), filePath);
      const baseName = path.basename(relativePath, path.extname(relativePath));
      const isTestFile = isTestSourcePath(relativePath);

      const imports = sourceFile.getImportDeclarations().map((imp: ImportDeclaration) => ({
        moduleSpecifier: imp.getModuleSpecifierValue(),
      }));

      const reExports = sourceFile
        .getExportDeclarations()
        .map(exp => exp.getModuleSpecifierValue())
        .filter((specifier): specifier is string => !!specifier)
        .map(moduleSpecifier => ({ moduleSpecifier }));

      const newExpressions = sourceFile
        .getDescendantsOfKind(SyntaxKind.NewExpression)
        .map((newExpr: NewExpression) => ({
          className: newExpr.getExpression().getText(),
        }));

      const callExpressions = sourceFile
        .getDescendantsOfKind(SyntaxKind.CallExpression)
        .map((callExpr: CallExpression) => callExpr.getExpression().getText());

      result.push({
        filePath,
        relativePath,
        baseName,
        isTestFile,
        imports,
        reExports,
        newExpressions,
        callExpressions,
        namespaces: [],
      });
    }

    return result;
  }
}
