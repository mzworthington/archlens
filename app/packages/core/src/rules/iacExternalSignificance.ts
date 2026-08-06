import { EntityRef } from '../models/schema';
import type { NodeType, SystemDependency, SystemNode, SystemSchema } from '../models/schema';

export type IacResourceKind = 'resource' | 'data' | 'module';

export type IacSignificance = 'primary' | 'supporting' | 'noise';

export type IacResourceRef = {
  providerType: string;
  kind: IacResourceKind;
  address: string;
};

export type IacExternalClassification = {
  vendorSlug: string;
  vendorName: string;
  productSlug?: string;
  productName?: string;
  significance: IacSignificance;
  nodeType: NodeType;
};

export type ProjectMeaningfulIacExternalsOptions = {
  landscapeEntityRef: string;
  infraSystemEntityRef: string;
  servedSystemRefs: string[];
};

export type MeaningfulIacExternalsProjection = {
  containerSchema: SystemSchema;
  proposedThirdParties: SystemNode[];
  proposedDependencies: SystemDependency[];
};

const INFRA_ROLE = 'infrastructure';

type PrimaryProductRule = {
  test: (providerType: string) => boolean;
  productSlug: string;
  productName: string;
  nodeType: NodeType;
};

const CLOUDFLARE_PRIMARIES: PrimaryProductRule[] = [
  {
    test: t => /pages_?project/.test(t) || t.endsWith('pagesproject'),
    productSlug: 'pages',
    productName: 'Cloudflare Pages',
    nodeType: 'gateway-api',
  },
  {
    // Primary bucket only — exclude CORS / custom domain helpers.
    test: t =>
      (/r2_?bucket/.test(t) || t.endsWith('r2bucket')) &&
      !/cors|custom_?domain|customdomain/.test(t),
    productSlug: 'r2',
    productName: 'Cloudflare R2',
    nodeType: 'rest-api',
  },
];

function isCloudflareSupporting(providerType: string): boolean {
  return (
    /dns_?record/.test(providerType) ||
    providerType.endsWith('dnsrecord') ||
    /pages_?domain/.test(providerType) ||
    providerType.endsWith('pagesdomain') ||
    /r2.*cors/.test(providerType) ||
    /r2.*custom_?domain/.test(providerType) ||
    providerType.includes('r2customdomain') ||
    providerType.includes('r2bucketcors')
  );
}

function titleCaseVendor(slug: string): string {
  if (slug === 'cloudflare') return 'Cloudflare';
  if (slug === 'aws') return 'AWS';
  if (slug === 'gcp' || slug === 'google') return 'Google Cloud';
  if (slug === 'azurerm' || slug === 'azure') return 'Azure';
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function vendorSlugFromProviderType(providerType: string): string | null {
  const lower = providerType.toLowerCase();
  if (lower.startsWith('cloudflare')) return 'cloudflare';
  return null;
}

function isZoneNoise(providerType: string, kind: IacResourceKind): boolean {
  if (kind !== 'data' && !/getzone|get_zone/.test(providerType)) {
    // data zones and getZone helpers
  }
  const t = providerType.toLowerCase();
  if (/get_?zone/.test(t) || t.endsWith('getzone')) return true;
  if (kind === 'data' && (t === 'cloudflare_zone' || t.endsWith('_zone'))) return true;
  return false;
}

/**
 * Classify a single IaC resource for external-dependency significance.
 * Returns null when the resource is not treated as a known external vendor surface.
 */
export function classifyIacResource(resource: IacResourceRef): IacExternalClassification | null {
  const providerType = resource.providerType.toLowerCase();
  const vendorSlug = vendorSlugFromProviderType(providerType);
  if (!vendorSlug) return null;

  const vendorName = titleCaseVendor(vendorSlug);

  if (isZoneNoise(providerType, resource.kind)) {
    return {
      vendorSlug,
      vendorName,
      significance: 'noise',
      nodeType: 'container',
    };
  }

  for (const rule of CLOUDFLARE_PRIMARIES) {
    if (!rule.test(providerType)) continue;
    return {
      vendorSlug,
      vendorName,
      productSlug: rule.productSlug,
      productName: rule.productName,
      significance: 'primary',
      nodeType: rule.nodeType,
    };
  }

  if (isCloudflareSupporting(providerType)) {
    return {
      vendorSlug,
      vendorName,
      significance: 'supporting',
      nodeType: 'container',
    };
  }

  // Known vendor, unknown resource — supporting so it cannot invent context vendors alone.
  return {
    vendorSlug,
    vendorName,
    significance: 'supporting',
    nodeType: 'container',
  };
}

/**
 * `properties.serves` membership when `role` is infrastructure.
 * BlueprintSpec properties are scalar, so multiple systems are a comma-separated string.
 */
export function infrastructureServesOf(node: SystemNode): string[] {
  if (node.properties?.role !== INFRA_ROLE) return [];
  const serves = node.properties.serves;
  if (typeof serves !== 'string' || !serves.trim()) return [];
  return serves
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function resourceRefFromNode(node: SystemNode): IacResourceRef | null {
  const providerType = node.properties?.['iac.provider_type'];
  const kind = node.properties?.['iac.kind'];
  const address = node.properties?.['iac.address'];
  if (typeof providerType !== 'string' || typeof address !== 'string') return null;
  const resolvedKind: IacResourceKind =
    kind === 'data' || kind === 'module' || kind === 'resource' ? kind : 'resource';
  return { providerType, kind: resolvedKind, address };
}

function vendorEntityRef(landscapeEntityRef: string, vendorSlug: string): string {
  return EntityRef.parse(`vendor-${vendorSlug}`, landscapeEntityRef);
}

function productEntityRef(
  infraSystemEntityRef: string,
  vendorSlug: string,
  productSlug: string
): string {
  return EntityRef.parse(`${vendorSlug}-${productSlug}`, infraSystemEntityRef);
}

/**
 * Project a parsed IaC container schema into meaningful container products and
 * context-level vendor third-parties for hydration.
 */
export function projectMeaningfulIacExternals(
  schema: SystemSchema,
  options: ProjectMeaningfulIacExternalsOptions
): MeaningfulIacExternalsProjection {
  const passThrough: SystemNode[] = [];
  const primaries = new Map<string, SystemNode>();
  const vendors = new Map<string, IacExternalClassification>();

  for (const node of schema.nodes ?? []) {
    const ref = resourceRefFromNode(node);
    if (!ref) {
      passThrough.push(node);
      continue;
    }

    const classification = classifyIacResource(ref);
    if (!classification) {
      passThrough.push(node);
      continue;
    }

    if (classification.significance === 'noise' || classification.significance === 'supporting') {
      continue;
    }

    if (!classification.productSlug || !classification.productName) continue;

    vendors.set(classification.vendorSlug, classification);
    const key = `${classification.vendorSlug}/${classification.productSlug}`;
    if (primaries.has(key)) continue;

    primaries.set(key, {
      entityRef: productEntityRef(
        options.infraSystemEntityRef,
        classification.vendorSlug,
        classification.productSlug
      ),
      type: classification.nodeType,
      name: classification.productName,
      parentEntityRef: options.infraSystemEntityRef,
      external: true,
      properties: {
        classification: 'third-party',
        vendor: classification.vendorName,
        vendorSlug: classification.vendorSlug,
        'iac.product': classification.productSlug,
        'iac.provider_type': ref.providerType,
        'iac.address': ref.address,
        'iac.kind': ref.kind,
        ...(typeof node.properties?.filepath === 'string'
          ? { filepath: node.properties.filepath }
          : {}),
      },
    });
  }

  const proposedThirdParties: SystemNode[] = [...vendors.values()].map(vendor => ({
    entityRef: vendorEntityRef(options.landscapeEntityRef, vendor.vendorSlug),
    type: 'software-system' as const,
    name: vendor.vendorName,
    external: true,
    properties: {
      classification: 'third-party',
      vendor: vendor.vendorName,
      vendorSlug: vendor.vendorSlug,
    },
  }));

  const proposedDependencies: SystemDependency[] = [];
  for (const served of options.servedSystemRefs) {
    for (const vendor of vendors.values()) {
      proposedDependencies.push({
        from: served,
        to: vendorEntityRef(options.landscapeEntityRef, vendor.vendorSlug),
        type: 'direct-call',
        description: `Depends on ${vendor.vendorName}`,
      });
    }
  }

  // Drop edges that referenced filtered-away noisy nodes; keep edges among survivors.
  const liveRefs = new Set<string>([
    ...passThrough.map(n => n.entityRef),
    ...[...primaries.values()].map(n => n.entityRef),
  ]);
  const dependencies = (schema.dependencies ?? []).filter(
    dep => liveRefs.has(dep.from) && liveRefs.has(dep.to)
  );

  return {
    containerSchema: {
      ...schema,
      nodes: [...passThrough, ...primaries.values()],
      dependencies,
    },
    proposedThirdParties,
    proposedDependencies,
  };
}
