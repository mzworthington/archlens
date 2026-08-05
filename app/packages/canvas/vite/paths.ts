import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Directory of this module (`app/packages/canvas/vite`). */
const viteDir = path.dirname(fileURLToPath(import.meta.url));

/** `app/packages/canvas` */
export const canvasPackageRoot = path.resolve(viteDir, '..');

export const repoDocs = path.resolve(canvasPackageRoot, '../../../docs');
export const repoSchemas = path.resolve(canvasPackageRoot, '../../../schemas');
export const repoSamples = path.resolve(canvasPackageRoot, '../../../samples');
export const repoChaosSpecs = path.resolve(canvasPackageRoot, '../../../chaos-specs');

export const bundledBlueprintsDest = path.resolve(canvasPackageRoot, 'public/bundled-blueprints');
export const bundledChaosSpecsDest = path.resolve(canvasPackageRoot, 'public/bundled-chaos-specs');

export const bundledWorkspaceName = 'samples';
