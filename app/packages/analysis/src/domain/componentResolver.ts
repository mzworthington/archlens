import type { ParsedSourceFile } from './types.ts';
import { isCSharpSourcePath, resolveCSharpComponent } from './csharpGrouping.ts';
import { isGoSourcePath, resolveGoComponent, resolveGoImportComponentId } from './goGrouping.ts';
import { isJavaSourcePath, resolveJavaComponent } from './javaGrouping.ts';
import { isPythonSourcePath, resolvePythonComponent } from './pythonDependencies.ts';
import {
  isTypeScriptSourcePath,
  resolveTypeScriptComponent,
  resolveTypeScriptImportComponentId,
} from './typescriptGrouping.ts';
import type { ComponentIdentity } from './folderComponentRollup.ts';

export type ComponentResolver = {
  matches: (relativePath: string) => boolean;
  resolveComponent: (file: ParsedSourceFile) => ComponentIdentity | null;
  resolveImportComponentId?: (fromRelativePath: string, moduleSpecifier: string) => string | null;
};

const COMPONENT_RESOLVERS: ComponentResolver[] = [
  {
    matches: isCSharpSourcePath,
    resolveComponent: file => resolveCSharpComponent(file.relativePath, file.baseName),
  },
  {
    matches: isPythonSourcePath,
    resolveComponent: file => resolvePythonComponent(file.relativePath, file.baseName),
  },
  {
    matches: isTypeScriptSourcePath,
    resolveComponent: file => resolveTypeScriptComponent(file.relativePath, file.baseName),
    resolveImportComponentId: resolveTypeScriptImportComponentId,
  },
  {
    matches: isJavaSourcePath,
    resolveComponent: file =>
      resolveJavaComponent(file.relativePath, file.baseName, file.namespaces),
  },
  {
    matches: isGoSourcePath,
    resolveComponent: file => resolveGoComponent(file.relativePath, file.baseName),
    resolveImportComponentId: resolveGoImportComponentId,
  },
];

export function resolveComponentIdentity(file: ParsedSourceFile): ComponentIdentity | null {
  for (const resolver of COMPONENT_RESOLVERS) {
    if (!resolver.matches(file.relativePath)) continue;
    return resolver.resolveComponent(file);
  }
  return null;
}

export function resolveImportComponentId(
  file: ParsedSourceFile,
  moduleSpecifier: string
): string | null {
  for (const resolver of COMPONENT_RESOLVERS) {
    if (!resolver.matches(file.relativePath)) continue;
    return resolver.resolveImportComponentId?.(file.relativePath, moduleSpecifier) ?? null;
  }
  return null;
}

export function usesDedicatedImportPass(relativePath: string): boolean {
  return isCSharpSourcePath(relativePath) || isPythonSourcePath(relativePath);
}
