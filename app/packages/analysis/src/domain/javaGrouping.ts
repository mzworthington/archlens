import { formatFolderComponentName, type ComponentIdentity } from './folderComponentRollup.ts';
import { slugify } from '@archlens/core';

const JAVA_EXTENSIONS = new Set(['java', 'kt', 'kts']);

const JAVA_LAYOUT_MARKERS = new Set(['java', 'kotlin']);

/** Boilerplate Java/Kotlin sources that add noise without architectural signal. */
function shouldSkipJavaFile(relativePath: string, baseName: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  if (/\/generated\//i.test(normalized)) return true;
  if (baseName === 'package-info') return true;
  return false;
}

export function isJavaSourcePath(relativePath: string): boolean {
  const ext = relativePath.replace(/\\/g, '/').split('.').pop()?.toLowerCase();
  return !!ext && JAVA_EXTENSIONS.has(ext);
}

function segmentsAfterJavaLayout(relativePath: string): string[] {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const dirParts = parts.slice(0, -1);
  const markerIdx = dirParts.findIndex(p => JAVA_LAYOUT_MARKERS.has(p.toLowerCase()));
  if (markerIdx < 0) return [];

  let afterMarker = dirParts.slice(markerIdx + 1);
  if (afterMarker.length >= 2) {
    afterMarker = afterMarker.slice(2);
  }

  const meaningful: string[] = [];
  for (const segment of afterMarker) {
    meaningful.push(segment);
  }

  const fileName = parts[parts.length - 1] ?? '';
  const baseName = fileName.replace(/\.(java|kt|kts)$/i, '');
  if (meaningful.length > 0) {
    const parent = meaningful[meaningful.length - 1]!;
    if (slugify(parent) === slugify(baseName)) {
      meaningful.pop();
    }
  }

  return meaningful;
}

/**
 * Roll up Java/Kotlin files by package folder under `src/main/java`.
 * e.g. `src/main/java/com/acme/orders/OrderService.java` → `orders`
 */
export function resolveJavaComponent(
  relativePath: string,
  baseName: string,
  namespaces: string[] = []
): ComponentIdentity | null {
  if (shouldSkipJavaFile(relativePath, baseName)) return null;

  let meaningful = segmentsAfterJavaLayout(relativePath);

  if (meaningful.length === 0 && namespaces.length > 0) {
    const pkgParts = namespaces[0]!.split('.').filter(Boolean);
    if (pkgParts.length >= 3) {
      meaningful = pkgParts.slice(2);
    }
  }

  if (meaningful.length === 0) {
    const leaf = slugify(baseName);
    return { componentId: leaf, componentName: formatFolderComponentName(leaf) };
  }

  const componentId = meaningful.map(slugify).join('/');
  return { componentId, componentName: formatFolderComponentName(componentId) };
}
