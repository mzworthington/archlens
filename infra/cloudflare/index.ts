import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const accountId = config.require('accountId');
const zoneId = config.require('zoneId');
const pagesProjectName = config.require('pagesProjectName');
const apexDomain = config.require('apexDomain');
const wwwDomain = config.require('wwwDomain');
const catalogBucketName = config.require('catalogBucketName');
const catalogDomain = config.require('catalogDomain');
const collabWorkerName = config.get('collabWorkerName') ?? 'archlens-collab';
const collabDomain = config.get('collabDomain') ?? `collab.${apexDomain}`;

const pagesProject = new cloudflare.PagesProject('archlens', {
  accountId,
  name: pagesProjectName,
  productionBranch: 'main',
});

const apexDns = new cloudflare.DnsRecord(
  'apex-pages',
  {
    zoneId,
    name: apexDomain,
    type: 'CNAME',
    content: pagesProject.subdomain,
    proxied: true,
    ttl: 1,
    comment: 'ArchLens Cloudflare Pages',
  },
  { deleteBeforeReplace: true }
);

const wwwDns = new cloudflare.DnsRecord(
  'www-pages',
  {
    zoneId,
    name: wwwDomain,
    type: 'CNAME',
    content: pagesProject.subdomain,
    proxied: true,
    ttl: 1,
    comment: 'ArchLens Cloudflare Pages',
  },
  { deleteBeforeReplace: true }
);

new cloudflare.PagesDomain(
  'apex',
  {
    accountId,
    projectName: pagesProject.name,
    name: apexDomain,
  },
  { dependsOn: [apexDns] }
);

new cloudflare.PagesDomain(
  'www',
  {
    accountId,
    projectName: pagesProject.name,
    name: wwwDomain,
  },
  { dependsOn: [wwwDns] }
);

const zone = cloudflare.getZoneOutput({ zoneId });

const webAnalytics = new cloudflare.WebAnalyticsSite('web-analytics', {
  accountId,
  zoneTag: zoneId,
  autoInstall: true,
});

new cloudflare.ObservatoryScheduledTest('observatory-apex', {
  zoneId,
  url: apexDomain,
});

const catalogBucket = new cloudflare.R2Bucket('blueprint-catalog', {
  accountId,
  name: catalogBucketName,
  location: 'enam',
});

new cloudflare.R2BucketCors('blueprint-catalog-cors', {
  accountId,
  bucketName: catalogBucket.name,
  rules: [
    {
      allowed: {
        origins: [
          `https://${apexDomain}`,
          `https://${wwwDomain}`,
          'http://localhost:5173',
          'http://localhost:5188',
        ],
        methods: ['GET', 'HEAD'],
        headers: ['*'],
      },
      id: 'archlens-canvas-read',
      maxAgeSeconds: 3600,
    },
  ],
});

const catalogCustomDomain = new cloudflare.R2CustomDomain('blueprint-catalog-domain', {
  accountId,
  bucketName: catalogBucket.name,
  domain: catalogDomain,
  zoneId,
  enabled: true,
});

/**
 * Collab share-link rooms. Script + Durable Object ship via Wrangler
 * (`app/packages/collab`); this stack attaches the hostname. Cloudflare
 * creates DNS + cert. The Worker must already have a deployed version —
 * CI `deploy-collab` on main, or `pnpm --filter @archlens/collab run deploy`
 * before the first apply that creates WorkersCustomDomain.
 */
new cloudflare.WorkersCustomDomain('collab-domain', {
  accountId,
  zoneId,
  zoneName: zone.name,
  hostname: collabDomain,
  service: collabWorkerName,
});

export const pagesProjectNameOut = pagesProject.name;
export const pagesSubdomain = pagesProject.subdomain;
export const zoneName = zone.name;
export const webAnalyticsSiteTag = webAnalytics.siteTag;
export const blueprintCatalogBucketName = catalogBucket.name;
export const blueprintCatalogDomain = catalogCustomDomain.domain;
export const collabWorkerNameOut = collabWorkerName;
export const collabDomainOut = collabDomain;
