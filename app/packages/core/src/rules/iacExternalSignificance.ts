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

type VendorPack = {
  slug: string;
  name: string;
  match: (providerType: string) => boolean;
  primaries: PrimaryProductRule[];
  isSupporting: (providerType: string) => boolean;
  isNoise: (providerType: string, kind: IacResourceKind) => boolean;
};

const CLOUDFLARE_PACK: VendorPack = {
  slug: 'cloudflare',
  name: 'Cloudflare',
  match: t => t.startsWith('cloudflare'),
  primaries: [
    {
      test: t => /pages_?project/.test(t) || t.endsWith('pagesproject'),
      productSlug: 'pages',
      productName: 'Cloudflare Pages',
      nodeType: 'gateway-api',
    },
    {
      test: t =>
        (/r2_?bucket/.test(t) || t.endsWith('r2bucket')) &&
        !/cors|custom_?domain|customdomain/.test(t),
      productSlug: 'r2',
      productName: 'Cloudflare R2',
      nodeType: 'rest-api',
    },
  ],
  isSupporting: t =>
    /dns_?record/.test(t) ||
    t.endsWith('dnsrecord') ||
    /pages_?domain/.test(t) ||
    t.endsWith('pagesdomain') ||
    /r2.*cors/.test(t) ||
    /r2.*custom_?domain/.test(t) ||
    t.includes('r2customdomain') ||
    t.includes('r2bucketcors'),
  isNoise: (t, kind) =>
    /get_?zone/.test(t) ||
    t.endsWith('getzone') ||
    (kind === 'data' && (t === 'cloudflare_zone' || t.endsWith('_zone'))),
};

const AWS_PACK: VendorPack = {
  slug: 'aws',
  name: 'AWS',
  match: t => t.startsWith('aws') || t.startsWith('awsx'),
  primaries: [
    {
      test: t => t.includes('lambda_function') || t.endsWith('lambda_function'),
      productSlug: 'lambda',
      productName: 'AWS Lambda',
      nodeType: 'serverless-function',
    },
    {
      test: t =>
        (/_s3_bucket$/.test(t) || t.includes('s3_bucket')) &&
        !/policy|notification|acl|cors|lifecycle|website|ownership|public_access|server_side/.test(
          t
        ),
      productSlug: 's3',
      productName: 'Amazon S3',
      nodeType: 'rest-api',
    },
    {
      test: t => /_rds_instance$|_db_instance$/.test(t) || t.includes('rds_cluster'),
      productSlug: 'rds',
      productName: 'Amazon RDS',
      nodeType: 'relational-database',
    },
    {
      test: t => t.includes('dynamodb'),
      productSlug: 'dynamodb',
      productName: 'Amazon DynamoDB',
      nodeType: 'database',
    },
    {
      test: t => t.includes('elasticache') || t.includes('memorydb'),
      productSlug: 'elasticache',
      productName: 'Amazon ElastiCache',
      nodeType: 'cache-store',
    },
    {
      test: t => t.includes('sns_topic') || t.includes('sqs_queue') || t.includes('_msk_'),
      productSlug: 'messaging',
      productName: 'AWS Messaging',
      nodeType: 'event-broker',
    },
    {
      test: t =>
        t.includes('api_gateway') ||
        t.includes('apigateway') ||
        t.includes('cloudfront') ||
        /_lb$|_alb$/.test(t),
      productSlug: 'edge',
      productName: 'AWS Edge / API',
      nodeType: 'gateway-api',
    },
    {
      test: t =>
        t.includes('ecs_service') ||
        t.includes('ecs_cluster') ||
        t.includes('_eks_') ||
        t.includes('fargate'),
      productSlug: 'compute',
      productName: 'AWS Compute',
      nodeType: 'microservice',
    },
  ],
  isSupporting: t =>
    t.includes('iam_') ||
    t.includes('security_group') ||
    t.includes('subnet') ||
    t.includes('route_table') ||
    t.includes('cloudwatch') ||
    t.includes('log_group') ||
    t.includes('s3_bucket_') ||
    t.includes('lambda_permission') ||
    t.includes('lambda_event') ||
    t.includes('eip') ||
    t.includes('nat_gateway') ||
    t.includes('internet_gateway') ||
    t.includes('vpc_'),
  isNoise: (t, kind) => kind === 'data' || t.includes('caller_identity') || t.includes('get_'),
};

const AZURE_PACK: VendorPack = {
  slug: 'azure',
  name: 'Azure',
  match: t => t.startsWith('azurerm') || t.startsWith('azuread') || t.startsWith('azure_'),
  primaries: [
    {
      test: t => t.includes('function_app'),
      productSlug: 'functions',
      productName: 'Azure Functions',
      nodeType: 'serverless-function',
    },
    {
      test: t => t.includes('mssql') || t.includes('postgresql') || t.includes('mysql'),
      productSlug: 'sql',
      productName: 'Azure SQL',
      nodeType: 'relational-database',
    },
    {
      test: t => t.includes('redis_cache') || t.includes('redis'),
      productSlug: 'redis',
      productName: 'Azure Cache for Redis',
      nodeType: 'cache-store',
    },
    {
      test: t => t.includes('container_app') || t.includes('kubernetes_cluster'),
      productSlug: 'compute',
      productName: 'Azure Compute',
      nodeType: 'microservice',
    },
    {
      test: t => t.includes('storage_account') || t.includes('storage_blob'),
      productSlug: 'storage',
      productName: 'Azure Storage',
      nodeType: 'rest-api',
    },
    {
      test: t => t.includes('application_gateway') || t.includes('cdn_'),
      productSlug: 'edge',
      productName: 'Azure Edge / Gateway',
      nodeType: 'gateway-api',
    },
  ],
  isSupporting: t =>
    t.includes('role_assignment') ||
    t.includes('role_definition') ||
    t.includes('subnet') ||
    t.includes('network_security') ||
    t.includes('private_endpoint') ||
    t.includes('monitor_'),
  isNoise: (_t, kind) => kind === 'data',
};

const GCP_PACK: VendorPack = {
  slug: 'gcp',
  name: 'Google Cloud',
  match: t => t.startsWith('google') || t.startsWith('gcp'),
  primaries: [
    {
      test: t => t.includes('cloudfunctions') || t.includes('cloud_function'),
      productSlug: 'functions',
      productName: 'Cloud Functions',
      nodeType: 'serverless-function',
    },
    {
      test: t => t.includes('sql_database') || t.includes('alloydb'),
      productSlug: 'sql',
      productName: 'Cloud SQL',
      nodeType: 'relational-database',
    },
    {
      test: t => t.includes('storage_bucket') && !/iam|acl|object/.test(t),
      productSlug: 'storage',
      productName: 'Cloud Storage',
      nodeType: 'rest-api',
    },
    {
      test: t => t.includes('pubsub'),
      productSlug: 'pubsub',
      productName: 'Pub/Sub',
      nodeType: 'event-broker',
    },
    {
      test: t =>
        t.includes('container_cluster') ||
        t.includes('cloud_run') ||
        t.includes('compute_instance'),
      productSlug: 'compute',
      productName: 'Google Cloud Compute',
      nodeType: 'microservice',
    },
    {
      test: t => t.includes('redis_instance') || t.includes('memorystore'),
      productSlug: 'memorystore',
      productName: 'Memorystore',
      nodeType: 'cache-store',
    },
  ],
  isSupporting: t =>
    t.includes('_iam_') ||
    t.includes('firewall') ||
    t.includes('subnetwork') ||
    t.includes('router') ||
    t.includes('address'),
  isNoise: (_t, kind) => kind === 'data',
};

/** Provider packs — Pulumi/Terraform stacks may mix several in one project. */
const VENDOR_PACKS: VendorPack[] = [CLOUDFLARE_PACK, AWS_PACK, AZURE_PACK, GCP_PACK];

function packForProviderType(providerType: string): VendorPack | null {
  return VENDOR_PACKS.find(pack => pack.match(providerType)) ?? null;
}

/**
 * Classify a single IaC resource for external-dependency significance.
 * Returns null when the resource is not under a known vendor pack.
 */
export function classifyIacResource(resource: IacResourceRef): IacExternalClassification | null {
  const providerType = resource.providerType.toLowerCase();
  const pack = packForProviderType(providerType);
  if (!pack) return null;

  if (pack.isNoise(providerType, resource.kind)) {
    return {
      vendorSlug: pack.slug,
      vendorName: pack.name,
      significance: 'noise',
      nodeType: 'container',
    };
  }

  for (const rule of pack.primaries) {
    if (!rule.test(providerType)) continue;
    return {
      vendorSlug: pack.slug,
      vendorName: pack.name,
      productSlug: rule.productSlug,
      productName: rule.productName,
      significance: 'primary',
      nodeType: rule.nodeType,
    };
  }

  if (pack.isSupporting(providerType)) {
    return {
      vendorSlug: pack.slug,
      vendorName: pack.name,
      significance: 'supporting',
      nodeType: 'container',
    };
  }

  // Known vendor, unknown resource — supporting so it cannot invent context vendors alone.
  return {
    vendorSlug: pack.slug,
    vendorName: pack.name,
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
 * Project a parsed IaC container schema into:
 * - internal IaC declaration nodes for **all** classified addresses (primaries,
 *   supporting, and noise) so the code graph stays complete
 * - external provisioned product nodes only for **primary** vendor×products
 * - `provisions` edges linking primary declarations → products
 * plus context-level vendor third-parties for hydration.
 *
 * Multi-provider Pulumi/Terraform stacks emit one product node per vendor×product
 * (shared by all primary declarations of that product) and one context third-party
 * per vendor that contributed a primary.
 */
export function projectMeaningfulIacExternals(
  schema: SystemSchema,
  options: ProjectMeaningfulIacExternalsOptions
): MeaningfulIacExternalsProjection {
  const passThrough: SystemNode[] = [];
  const declarations: SystemNode[] = [];
  const resources = new Map<string, SystemNode>();
  const vendors = new Map<string, IacExternalClassification>();
  const provisions: SystemDependency[] = [];

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

    const isPrimary =
      classification.significance === 'primary' &&
      !!classification.productSlug &&
      !!classification.productName;

    declarations.push({
      ...node,
      external: false,
      // Container diagram nodes are top-level on this schema; do not parent them to the
      // diagram entityRef (that breaks layout — every node looks like a group child).
      ...(node.parentEntityRef && node.parentEntityRef !== options.infraSystemEntityRef
        ? { parentEntityRef: node.parentEntityRef }
        : {}),
      properties: {
        ...node.properties,
        'iac.view': 'declaration',
        'iac.significance': classification.significance,
        vendor: classification.vendorName,
        vendorSlug: classification.vendorSlug,
        ...(classification.productSlug ? { 'iac.product': classification.productSlug } : {}),
      },
    });

    if (!isPrimary) {
      // Supporting / noise stay on the IaC graph only — no provisioned companion.
      continue;
    }

    vendors.set(classification.vendorSlug, classification);
    const productKey = `${classification.vendorSlug}/${classification.productSlug}`;
    const resourceRef = productEntityRef(
      options.infraSystemEntityRef,
      classification.vendorSlug,
      classification.productSlug!
    );

    if (!resources.has(productKey)) {
      resources.set(productKey, {
        entityRef: resourceRef,
        type: classification.nodeType,
        name: classification.productName!,
        external: true,
        properties: {
          classification: 'third-party',
          vendor: classification.vendorName,
          vendorSlug: classification.vendorSlug,
          'iac.view': 'resource',
          'iac.product': classification.productSlug!,
          'iac.provider_type': ref.providerType,
          'iac.address': ref.address,
          'iac.kind': ref.kind,
          ...(typeof node.properties?.filepath === 'string'
            ? { filepath: node.properties.filepath }
            : {}),
        },
      });
    }

    provisions.push({
      from: node.entityRef,
      to: resourceRef,
      type: 'provisions',
      description: `Provisions ${classification.productName}`,
    });
  }

  const proposedThirdParties: SystemNode[] = [...vendors.values()]
    .sort((a, b) => a.vendorSlug.localeCompare(b.vendorSlug))
    .map(vendor => ({
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
    for (const vendor of proposedThirdParties) {
      proposedDependencies.push({
        from: served,
        to: vendor.entityRef,
        type: 'direct-call',
        description: `Depends on ${vendor.name}`,
      });
    }
  }

  const liveRefs = new Set<string>([
    ...passThrough.map(n => n.entityRef),
    ...declarations.map(n => n.entityRef),
    ...[...resources.values()].map(n => n.entityRef),
  ]);
  const retainedDependencies = (schema.dependencies ?? []).filter(
    dep => liveRefs.has(dep.from) && liveRefs.has(dep.to)
  );

  return {
    containerSchema: {
      ...schema,
      nodes: [...passThrough, ...declarations, ...resources.values()],
      dependencies: [...retainedDependencies, ...provisions],
    },
    proposedThirdParties,
    proposedDependencies,
  };
}
