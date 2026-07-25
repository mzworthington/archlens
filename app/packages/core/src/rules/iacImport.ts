import type { SystemSchema } from '../models/schema';
import type { InfraImportOptions as InfraSchemaImportOptions } from './infraSchemaMap';
import { parsePulumiBatchToSchema, type PulumiSourceFile } from './pulumiImport';
import { parsePulumiStackToSchema } from './pulumiStack';
import { parseTerraformBatchToSchema, type TerraformSourceFile } from './terraformImport';

export type IacImportOptions = InfraSchemaImportOptions & {
  /** Force source kind; default auto-detects per file. */
  kind?: IacSourceKind;
  /** Pulumi project runtime from Pulumi.yaml (yaml, python, nodejs, …). */
  pulumiRuntime?: string;
};

export type IacVendor = 'terraform' | 'pulumi';

export type IacSourceKind =
  | 'auto'
  | 'terraform-hcl'
  | 'terraform-json'
  | 'pulumi-yaml'
  | 'pulumi-typescript'
  | 'pulumi-python';

export interface IacSourceFile {
  path: string;
  content: string;
}

export interface IacParseResult {
  schema: SystemSchema;
  vendor: IacVendor;
  format: string;
  warnings: string[];
}

const PULUMI_PROJECT_FILE = /^pulumi\.ya?ml$/i;
const PULUMI_STACK_FILE = /^pulumi\.[^.]+\.ya?ml$/i;

function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return normalized.split('/').pop() || path;
}

function detectFromPath(path: string): Exclude<IacSourceKind, 'auto'> | null {
  const lower = path.toLowerCase();
  const name = basename(lower);

  if (lower.endsWith('.tf.json')) return 'terraform-json';
  if (lower.endsWith('.tf')) return 'terraform-hcl';
  if (PULUMI_PROJECT_FILE.test(name) || PULUMI_STACK_FILE.test(name)) return 'pulumi-yaml';
  if (/\.py$/i.test(path)) return 'pulumi-python';
  if (/\.tsx?$/i.test(path)) return 'pulumi-typescript';
  if (/\.ya?ml$/i.test(path)) return 'pulumi-yaml';
  return null;
}

function detectFromContent(content: string): Exclude<IacSourceKind, 'auto'> {
  const trimmed = content.trim();
  if (/^\s*resource\s+"/m.test(trimmed)) return 'terraform-hcl';
  if (/^\s*\{/.test(trimmed) && /"resource"\s*:/m.test(trimmed)) return 'terraform-json';
  if (/^resources\s*:/m.test(trimmed) || /\nresources\s*:/m.test(trimmed)) return 'pulumi-yaml';
  if (/^import\s/m.test(trimmed) || /\bnew\s+[\w.]+\(/.test(trimmed)) return 'pulumi-typescript';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'terraform-json';
  return 'terraform-hcl';
}

/** Detect Terraform vs Pulumi and concrete format from path and content. */
export function detectIacSourceKind(path: string, content: string): Exclude<IacSourceKind, 'auto'> {
  return detectFromPath(path) ?? detectFromContent(content);
}

export function vendorForKind(kind: Exclude<IacSourceKind, 'auto'>): IacVendor {
  return kind.startsWith('terraform') ? 'terraform' : 'pulumi';
}

function resolveKind(
  path: string,
  content: string,
  forced?: IacSourceKind
): Exclude<IacSourceKind, 'auto'> {
  if (forced && forced !== 'auto') return forced;
  return detectIacSourceKind(path, content);
}

function pulumiFormatForKind(
  kind: Exclude<IacSourceKind, 'auto'>
): 'yaml' | 'typescript' | 'python' {
  if (kind === 'pulumi-typescript') return 'typescript';
  if (kind === 'pulumi-python') return 'python';
  return 'yaml';
}

function defaultPathForKind(kind: Exclude<IacSourceKind, 'auto'>): string {
  switch (kind) {
    case 'terraform-json':
      return 'main.tf.json';
    case 'pulumi-yaml':
      return 'Pulumi.yaml';
    case 'pulumi-typescript':
      return 'index.ts';
    case 'pulumi-python':
      return '__main__.py';
    default:
      return 'main.tf';
  }
}

export function parseIacToSchema(
  source: string,
  path: string,
  options: IacImportOptions
): IacParseResult {
  const kind = resolveKind(path, source, options.kind);
  const vendor = vendorForKind(kind);

  if (vendor === 'terraform') {
    const format = kind === 'terraform-json' ? 'json' : 'hcl';
    const result = parseTerraformBatchToSchema(
      [{ path, content: source, sourceFormat: format }],
      options
    );
    return { schema: result.schema, vendor, format: result.format, warnings: result.warnings };
  }

  const format = pulumiFormatForKind(kind);
  const result = parsePulumiBatchToSchema(
    [{ path, content: source, sourceFormat: format }],
    options
  );
  return { schema: result.schema, vendor, format: result.format, warnings: result.warnings };
}

export function parseIacBatchToSchema(
  files: IacSourceFile[],
  options: IacImportOptions
): IacParseResult {
  if (files.length === 0) {
    const kind = options.kind && options.kind !== 'auto' ? options.kind : 'terraform-hcl';
    return parseIacToSchema('', defaultPathForKind(kind), { ...options, kind });
  }

  const kinds = files.map(file => resolveKind(file.path, file.content, options.kind));
  const vendors = new Set(kinds.map(kind => vendorForKind(kind)));
  if (vendors.size > 1) {
    throw new Error('mixed-vendor: import Terraform and Pulumi sources separately');
  }

  const vendor = [...vendors][0];

  if (vendor === 'terraform') {
    const tfFiles: TerraformSourceFile[] = files.map(file => ({
      path: file.path,
      content: file.content,
      sourceFormat:
        resolveKind(file.path, file.content, options.kind) === 'terraform-json' ? 'json' : 'hcl',
    }));
    const result = parseTerraformBatchToSchema(tfFiles, options);
    return { schema: result.schema, vendor, format: result.format, warnings: result.warnings };
  }

  const pulumiFiles: PulumiSourceFile[] = files.map(file => ({
    path: file.path,
    content: file.content,
    sourceFormat: pulumiFormatForKind(resolveKind(file.path, file.content, options.kind)),
  }));
  const result = options.pulumiRuntime
    ? parsePulumiStackToSchema(pulumiFiles, options.pulumiRuntime, options)
    : parsePulumiBatchToSchema(pulumiFiles, options);
  return { schema: result.schema, vendor, format: result.format, warnings: result.warnings };
}
