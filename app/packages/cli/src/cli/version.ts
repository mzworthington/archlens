import { ARCHLENS_BUILD_VERSION } from './buildVersion.generated.ts';
import { FLAG } from './help/flagCatalog.ts';

/** Installed release tag (e.g. v0.1.5) or `dev` for source / local builds. */
export function getArchlensVersion(): string {
  return ARCHLENS_BUILD_VERSION;
}

export function isCompiledRelease(): boolean {
  return getArchlensVersion() !== 'dev';
}

export function wantsVersionFlag(argv: string[]): boolean {
  return argv.includes(FLAG.version) || argv.includes(FLAG.versionShort);
}
