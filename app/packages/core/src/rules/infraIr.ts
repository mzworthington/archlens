/** Provider-agnostic intermediate representation for IaC → SystemSchema mapping. */

export type InfraKind = 'resource' | 'data' | 'module';

export interface InfraNode {
  /** Terraform-style address, e.g. `aws_lambda_function.api` or `module.vpc`. */
  address: string;
  kind: InfraKind;
  /** Resource/data type (`aws_lambda_function`) or `module`. */
  providerType: string;
  /** Local name token (`api`, `vpc`). */
  name: string;
  /** Module source string when kind is module. */
  source?: string;
  /** Repo-relative path of the declaring source file, when known. */
  sourceFile?: string;
  /** True when body contains count or for_each. */
  hasExpansion: boolean;
  /** Raw attribute bag (literals + expression markers). */
  body: Record<string, unknown>;
}

/** Normalize an IaC parse label to a repo-relative filepath, omitting synthetic labels. */
export function normalizeIacSourceFilePath(label: string): string | undefined {
  if (!label || label === '<input>') return undefined;
  return label.replace(/\\/g, '/').replace(/^\.\//, '');
}

export interface InfraEdge {
  from: string;
  to: string;
  /** Original expression or depends_on entry that produced the edge. */
  via: string;
}

export interface InfraIR {
  nodes: InfraNode[];
  edges: InfraEdge[];
  warnings: string[];
}
