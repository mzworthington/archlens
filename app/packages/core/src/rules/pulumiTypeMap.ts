/** Map a Pulumi type token (e.g. `aws:lambda:Function`) to a Terraform-style provider type. */
export function pulumiTypeToProviderType(pulumiType: string): string {
  const parts = pulumiType.split(':');
  if (parts.length >= 3) {
    const [provider, module, ...rest] = parts;
    const typeName = rest.join(':');
    return `${provider}_${module}_${typeName}`.replace(/\//g, '_').toLowerCase();
  }
  return pulumiType.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
}

/** Map a TS qualified name (e.g. `aws.lambda.Function`) to a Pulumi type token. */
export function tsQualifiedNameToPulumiType(qualified: string): string {
  const parts = qualified.split('.');
  if (parts.length >= 3) {
    const [provider, module, ...rest] = parts;
    const className = rest.join('.');
    return `${provider}:${module}:${className}`;
  }
  return qualified;
}

/** Map a Python qualified name (e.g. `pulumi_gcp.container.Cluster` or `aws.s3.Bucket`) to a Pulumi type token. */
export function pythonQualifiedToPulumiType(qualified: string): string {
  if (qualified.startsWith('pulumi_')) {
    const withoutPrefix = qualified.slice('pulumi_'.length);
    const dot = withoutPrefix.indexOf('.');
    if (dot > 0) {
      const provider = withoutPrefix.slice(0, dot);
      const rest = withoutPrefix.slice(dot + 1).split('.');
      if (rest.length >= 2) {
        const [module, ...typeParts] = rest;
        return `${provider}:${module}:${typeParts.join('.')}`;
      }
    }
  }
  return tsQualifiedNameToPulumiType(qualified);
}
