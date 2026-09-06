import type { SystemNode, SystemSchema } from '@archlens/core';

export const IAC_IMPORT_FILTER_NOTE =
  'Same filter as a CLI scan: primary products become third-party externals. Lookups and helpers stay as IaC declarations.';

export const IAC_IMPORT_MERGE_FOOTER =
  'Meaningful externals match a CLI scan of this pack. Real name collisions stay listed. Changes stay in your draft until you commit via Pending Changes.';

export function describeIacImportPreview(schema: SystemSchema): string {
  const declarations = schema.nodes.filter(n => n.properties?.['iac.view'] === 'declaration');
  const externals = schema.nodes.filter(n => n.properties?.['iac.view'] === 'resource');
  const products = externals
    .map(n => n.properties?.['iac.product'])
    .filter((product): product is string => typeof product === 'string')
    .sort();
  const productLabel = products.length > 0 ? ` (${products.join(', ')})` : '';
  const externalNoun = externals.length === 1 ? 'meaningful external' : 'meaningful externals';
  const declarationNoun = declarations.length === 1 ? 'IaC declaration' : 'IaC declarations';
  return `${externals.length} ${externalNoun}${productLabel}, ${declarations.length} ${declarationNoun}`;
}

export function describeIacImportNodeQualifier(node: SystemNode): string {
  if (node.properties?.['iac.view'] === 'resource') return ', meaningful external';
  if (node.properties?.['iac.view'] === 'declaration') {
    const significance = node.properties['iac.significance'];
    return typeof significance === 'string' ? `, ${significance}` : ', declaration';
  }
  return node.external ? ', external' : '';
}
