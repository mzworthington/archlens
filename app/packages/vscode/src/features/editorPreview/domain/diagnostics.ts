import { parseSchemaFromYaml, validateGraph, type SystemSchema } from '@archlens/core';
import { looksLikeBlueprint, nameFor } from './copyConstants';

export interface BlueprintProblem {
  readonly message: string;
  readonly line: number;
}

/** Problems for a blueprint. A YAML file that is not a blueprint contributes none. */
export function blueprintProblems(content: string): readonly BlueprintProblem[] {
  let schema: SystemSchema;
  try {
    schema = parseSchemaFromYaml(content);
  } catch (error) {
    if (!looksLikeBlueprint(content)) return [];
    return [{ message: plainSchemaMessage(error), line: 0 }];
  }

  const issues = validateGraph(schema).issues;
  const cycle = issues.find(issue => issue.type === 'cycle' && issue.path);
  if (cycle?.path) {
    return [{ message: cycleSentence(schema, cycle.path), line: lineOf(content, cycle.path[0]) }];
  }

  const first = issues[0];
  return first ? [{ message: first.message, line: 0 }] : [];
}

function plainSchemaMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'This blueprint could not be read.';
  const stripped = raw.replace(
    /^Invalid schema YAML\. (?:Schema Validation Error|YAML Parsing Error): /,
    ''
  );
  return stripped.split('; ')[0] ?? stripped;
}

function cycleSentence(schema: SystemSchema, path: readonly string[]): string {
  const refs = path[0] === path[path.length - 1] ? path.slice(0, -1) : [...path];
  const names = refs.map(ref => nameFor(schema, ref));
  if (names.length === 2) {
    return `Cycle: ${names[0]} calls ${names[1]} and ${names[1]} calls ${names[0]}.`;
  }
  const calls = names.map((name, index) => `${name} calls ${names[(index + 1) % names.length]}`);
  const last = calls[calls.length - 1];
  const head = calls.slice(0, -1).join(', ');
  return `Cycle: ${head} and ${last}.`;
}

function lineOf(content: string, entityRef: string | undefined): number {
  if (!entityRef) return 0;
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex(line => line.includes(`from: ${entityRef}`));
  return index < 0 ? 0 : index;
}
