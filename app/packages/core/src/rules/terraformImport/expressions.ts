interface HclExpression {
  __hcl: 'expression';
  kind?: string;
  source?: string;
}

function isExpression(value: unknown): value is HclExpression {
  return (
    typeof value === 'object' && value !== null && (value as HclExpression).__hcl === 'expression'
  );
}

export function collectExpressionSources(value: unknown, out: string[]): void {
  if (isExpression(value)) {
    if (typeof value.source === 'string' && value.source.length > 0) {
      out.push(value.source);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectExpressionSources(item, out);
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) collectExpressionSources(child, out);
  }
}

const META_ROOTS = new Set(['var', 'local', 'path', 'terraform', 'each', 'count', 'self']);

export function extractAddressesFromExpression(source: string): string[] {
  const addresses = new Set<string>();
  const re =
    /\b(?:data\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)|module\.([A-Za-z0-9_]+)|([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z0-9_]+))(?:\.[A-Za-z0-9_]+)*\b/g;

  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    if (match[1] !== undefined && match[2] !== undefined) {
      addresses.add(`data.${match[1]}.${match[2]}`);
      continue;
    }
    if (match[3] !== undefined) {
      addresses.add(`module.${match[3]}`);
      continue;
    }
    const type = match[4];
    const name = match[5];
    if (!type || !name) continue;
    if (META_ROOTS.has(type)) continue;
    addresses.add(`${type}.${name}`);
  }

  return [...addresses];
}
