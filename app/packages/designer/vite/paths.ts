import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Directory of this module (`app/packages/designer/vite`). */
const viteDir = path.dirname(fileURLToPath(import.meta.url));

/** `app/packages/designer` */
export const designerPackageRoot = path.resolve(viteDir, '..');

export const repoDocs = path.resolve(designerPackageRoot, '../../../docs');
export const repoSchemas = path.resolve(designerPackageRoot, '../../../schemas');
export const repoSamples = path.resolve(designerPackageRoot, '../../../samples');
export const repoChaosSpecs = path.resolve(designerPackageRoot, '../../../chaos-specs');

export const bundledBlueprintsDest = path.resolve(designerPackageRoot, 'public/bundled-blueprints');
export const bundledChaosSpecsDest = path.resolve(
  designerPackageRoot,
  'public/bundled-chaos-specs'
);

export const bundledWorkspaceName = 'samples';
