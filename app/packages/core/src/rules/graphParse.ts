import * as yaml from 'js-yaml';
import { z } from 'zod';
import type { SystemSchema } from '../models/schema';
import { formatZodError, parseWireDocument } from './graphSchema';

export function parseSchemaFromYaml(yamlContent: string): SystemSchema {
  let parsed: unknown;
  try {
    parsed = yaml.load(yamlContent);
  } catch (yamlErr: unknown) {
    const message = yamlErr instanceof Error ? yamlErr.message : String(yamlErr);
    throw new Error(`Invalid schema YAML. YAML Parsing Error: ${message}`);
  }

  try {
    return parseWireDocument(parsed);
  } catch (zodErr) {
    if (zodErr instanceof z.ZodError) {
      throw new Error(`Invalid schema YAML. Schema Validation Error: ${formatZodError(zodErr)}`);
    }
    throw zodErr;
  }
}

export function parseSchemaFromJson(jsonContent: string): SystemSchema {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (jsonErr: unknown) {
    const message = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
    throw new Error(`Invalid schema JSON. JSON Parsing Error: ${message}`);
  }

  try {
    return parseWireDocument(parsed);
  } catch (zodErr) {
    if (zodErr instanceof z.ZodError) {
      throw new Error(`Invalid schema JSON. Schema Validation Error: ${formatZodError(zodErr)}`);
    }
    throw zodErr;
  }
}
