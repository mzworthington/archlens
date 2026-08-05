import { normalizeIacSourceFilePath, type InfraEdge, type InfraNode } from './infraIr';
import { pulumiTypeToProviderType } from './pulumiTypeMap';

export {
  pulumiTypeToProviderType,
  pythonQualifiedToPulumiType,
  tsQualifiedNameToPulumiType,
} from './pulumiTypeMap';

interface PulumiYamlResource {
  type?: string;
  properties?: Record<string, unknown>;
  options?: Record<string, unknown>;
  get?: Record<string, unknown>;
}

export function pushNode(
  nodes: InfraNode[],
  seen: Map<string, string>,
  fileLabel: string,
  node: InfraNode
): void {
  const prior = seen.get(node.address);
  if (prior) {
    throw new Error(
      `duplicate-address: ${node.address} declared in both ${prior} and ${fileLabel}`
    );
  }
  seen.set(node.address, fileLabel);
  nodes.push({
    ...node,
    sourceFile: normalizeIacSourceFilePath(fileLabel),
  });
}

export function collectPulumiInterpolationRefs(value: unknown, out: Set<string>): void {
  if (typeof value === 'string') {
    const re = /\$\{([^}.]+)(?:\.[^}]*)?\}/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(value)) !== null) {
      if (match[1]) out.add(match[1]);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPulumiInterpolationRefs(item, out);
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) collectPulumiInterpolationRefs(child, out);
  }
}

export function yamlResourcesToNodes(
  doc: Record<string, unknown>,
  fileLabel: string,
  nodes: InfraNode[],
  seen: Map<string, string>
): Map<string, string> {
  const keyToAddress = new Map<string, string>();
  const resources = doc.resources;
  if (typeof resources !== 'object' || resources === null) return keyToAddress;

  for (const [key, raw] of Object.entries(resources as Record<string, unknown>)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const resource = raw as PulumiYamlResource;
    const pulumiType = typeof resource.type === 'string' ? resource.type : '';
    if (!pulumiType) continue;

    const address = `${pulumiType}.${key}`;
    const providerType = pulumiTypeToProviderType(pulumiType);
    const body: Record<string, unknown> = {
      ...(resource.properties ?? {}),
      ...(resource.options ? { options: resource.options } : {}),
    };

    pushNode(nodes, seen, fileLabel, {
      address,
      kind: resource.get ? 'data' : 'resource',
      providerType,
      name: key,
      hasExpansion: false,
      body,
    });
    keyToAddress.set(key, address);
  }

  return keyToAddress;
}

export function buildYamlEdges(
  nodes: InfraNode[],
  keyToAddress: Map<string, string>,
  warnings: string[]
): InfraEdge[] {
  const edges: InfraEdge[] = [];
  const edgeKeys = new Set<string>();
  const addressSet = new Set(nodes.map(n => n.address));

  const addEdge = (from: string, to: string, via: string) => {
    if (from === to) return;
    if (!addressSet.has(to)) {
      warnings.push(`unresolved-ref:${via}`);
      return;
    }
    const key = `${from}->${to}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, via });
  };

  for (const node of nodes) {
    const refs = new Set<string>();
    collectPulumiInterpolationRefs(node.body, refs);
    for (const refKey of refs) {
      const target = keyToAddress.get(refKey);
      if (!target) {
        warnings.push(`unresolved-ref:\${${refKey}}`);
        continue;
      }
      addEdge(node.address, target, `\${${refKey}}`);
    }
  }

  return edges;
}
