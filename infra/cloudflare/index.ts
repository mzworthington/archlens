import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const accountId = config.require('accountId');
const zoneId = config.require('zoneId');
const pagesProjectName = config.get('pagesProjectName') ?? 'archlens';
const apexDomain = config.get('apexDomain') ?? 'archlens.dev';
const wwwDomain = config.get('wwwDomain') ?? 'www.archlens.dev';

// Direct-upload Pages project — CI builds dist/ and wrangler pages deploy uploads assets.
const pagesProject = new cloudflare.PagesProject('archlens', {
  accountId,
  name: pagesProjectName,
  productionBranch: 'main',
});

// Proxied CNAMEs to the Pages project (apex uses CNAME flattening).
// If apex/www already exist (e.g. leftover GitHub Pages targets), delete them in the
// Cloudflare DNS UI or import into this stack before the first apply — see README.
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
  { deleteBeforeReplace: true },
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
  { deleteBeforeReplace: true },
);

new cloudflare.PagesDomain(
  'apex',
  {
    accountId,
    projectName: pagesProject.name,
    name: apexDomain,
  },
  { dependsOn: [apexDns] },
);

new cloudflare.PagesDomain(
  'www',
  {
    accountId,
    projectName: pagesProject.name,
    name: wwwDomain,
  },
  { dependsOn: [wwwDns] },
);

const zone = cloudflare.getZoneOutput({ zoneId });

export const pagesProjectNameOut = pagesProject.name;
export const pagesSubdomain = pagesProject.subdomain;
export const zoneName = zone.name;
export const apexDnsContent = apexDns.content;
export const wwwDnsContent = wwwDns.content;
