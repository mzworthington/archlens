import type {
  C4Level,
  NodeType,
  PropertyMap,
  SystemDependency,
  SystemNode,
  SystemSchema,
} from '../models/schema';
import { mapProviderTypeToNodeType } from './iacResourceMap';
import type { InfraIR, InfraNode } from './infraIr';

export interface InfraImportOptions {
  targetLevel: C4Level;
  parentEntityRef?: string;
}

/** Slugify an IaC address into entityRef path segments. */
export function addressToEntityRefSlug(address: string): string {
  return (
    address
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.join('-') ?? ''
  );
}

export function mintEntityRef(address: string, parentEntityRef?: string): string {
  const slug = addressToEntityRefSlug(address);
  if (!parentEntityRef) return slug;
  return `${parentEntityRef}/${slug}`;
}

function isRemoteModuleSource(source: string): boolean {
  if (source.startsWith('./') || source.startsWith('../')) return false;
  if (source.startsWith('/')) return false;
  return true;
}

const GENERIC_TF_LABELS = new Set(['this', 'main', 'default', 'current']);

function humanizeToken(token: string): string {
  return token
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function humanizeProviderType(providerType: string): string {
  if (providerType === 'module') return 'Module';
  const prefix = providerType.startsWith('aws_')
    ? 'AWS '
    : providerType.startsWith('google_')
      ? 'Google '
      : providerType.startsWith('azurerm_')
        ? 'Azure '
        : '';
  const rest = providerType.replace(/^(aws|google|azurerm)_/, '');
  return `${prefix}${humanizeToken(rest)}`.trim();
}

function isGenericLabel(label: string): boolean {
  return GENERIC_TF_LABELS.has(label.toLowerCase());
}

function displayName(node: InfraNode): string {
  if (!isGenericLabel(node.name)) return node.name;
  return humanizeProviderType(node.providerType);
}

function resolveNodeType(node: InfraNode, warnings: string[]): NodeType {
  if (node.kind === 'module') return 'container';
  const mapped = mapProviderTypeToNodeType(node.providerType);
  if (!mapped.known) {
    warnings.push(`unknown-resource-type:${node.providerType}`);
  }
  return mapped.nodeType;
}

function isExternal(node: InfraNode): boolean {
  if (node.kind === 'data') return true;
  if (node.kind === 'module') {
    return node.source ? isRemoteModuleSource(node.source) : false;
  }
  return false;
}

function toProperties(node: InfraNode): PropertyMap {
  const props: PropertyMap = {
    'iac.address': node.address,
    'iac.provider_type': node.providerType,
    'iac.kind': node.kind,
  };
  if (node.source) props['iac.source'] = node.source;
  if (node.sourceFile) props.filepath = node.sourceFile;
  return props;
}

export function infraIrToSchema(
  ir: InfraIR,
  options: InfraImportOptions
): { schema: SystemSchema; warnings: string[] } {
  const warnings = [...ir.warnings];
  const nodes: SystemNode[] = ir.nodes.map(node => ({
    entityRef: mintEntityRef(node.address, options.parentEntityRef),
    type: resolveNodeType(node, warnings),
    name: displayName(node),
    external: isExternal(node),
    properties: toProperties(node),
  }));

  const addressToRef = new Map(
    ir.nodes.map(n => [n.address, mintEntityRef(n.address, options.parentEntityRef)] as const)
  );

  const dependencies: SystemDependency[] = [];
  const depKeys = new Set<string>();
  for (const edge of ir.edges) {
    const from = addressToRef.get(edge.from);
    const to = addressToRef.get(edge.to);
    if (!from || !to) continue;
    const key = `${from}->${to}`;
    if (depKeys.has(key)) continue;
    depKeys.add(key);
    dependencies.push({ from, to, type: 'direct-call' });
  }

  const schema: SystemSchema = {
    name: options.parentEntityRef
      ? options.parentEntityRef.split('/').pop() || 'infrastructure'
      : 'infrastructure',
    version: '0.1.0',
    level: options.targetLevel,
    nodes,
    dependencies,
  };

  if (options.parentEntityRef) {
    schema.entityRef = options.parentEntityRef;
  }

  return { schema, warnings };
}
