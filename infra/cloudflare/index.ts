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

// PagesDomain attaches custom hostnames and auto-configures DNS when the zone is on Cloudflare.
new cloudflare.PagesDomain('apex', {
  accountId,
  projectName: pagesProject.name,
  name: apexDomain,
});

new cloudflare.PagesDomain('www', {
  accountId,
  projectName: pagesProject.name,
  name: wwwDomain,
});

const zone = cloudflare.getZoneOutput({ zoneId });

export const pagesProjectNameOut = pagesProject.name;
export const pagesSubdomain = pagesProject.subdomain;
export const zoneName = zone.name;
