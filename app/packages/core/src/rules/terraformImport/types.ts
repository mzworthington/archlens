import type { SystemSchema } from '../../models/schema';
import type { InfraImportOptions } from '../infra/infraSchemaMap';

export type TerraformFormat = 'hcl' | 'json';

export interface TerraformImportOptions extends InfraImportOptions {
  sourceFormat?: TerraformFormat | 'auto';
}

export interface TerraformParseResult {
  schema: SystemSchema;
  format: TerraformFormat;
  warnings: string[];
}

export interface TerraformSourceFile {
  path: string;
  content: string;
  sourceFormat?: TerraformFormat | 'auto';
}
