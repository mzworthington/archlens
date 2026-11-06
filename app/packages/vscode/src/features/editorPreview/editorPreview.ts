import { parseSchemaFromYaml } from '@archlens/core';

export const UNTRUSTED_WORKSPACE_MESSAGE =
  'ArchLens does not read this folder until the workspace is trusted.';

export const NO_MAP_MESSAGE = 'No map in this folder.';

const GENERATE_TURNED_OFF_BODY = 'Generating a diagram from code is turned off in this preview.';

export const GENERATE_INTEREST_DISCUSSION_URL =
  'https://github.com/mzworthington/archlens/discussions';

export const GENERATE_PROMPT = {
  title: 'Generate diagram from workspace',
  body: GENERATE_TURNED_OFF_BODY,
  tellUsLabel: 'Tell us you want this',
  cancelLabel: 'Cancel',
} as const;

export type GeneratePromptAction = 'tell-us' | 'cancel' | 'escape';

export interface BlueprintFile {
  path: string;
  content: string;
}

export interface DiagramSystem {
  name: string;
  entityRef: string;
}

export interface DiagramLink {
  fromName: string;
  toName: string;
}

export interface ArchitectureMap {
  name: string;
  systems: readonly DiagramSystem[];
  links: readonly DiagramLink[];
}

export type OpenArchitectureMapResult =
  | { kind: 'untrusted'; message: typeof UNTRUSTED_WORKSPACE_MESSAGE }
  | { kind: 'empty'; message: typeof NO_MAP_MESSAGE }
  | { kind: 'map'; map: ArchitectureMap };

export async function openArchitectureMap(input: {
  trusted: boolean;
  listBlueprints: () => Promise<readonly BlueprintFile[]>;
}): Promise<OpenArchitectureMapResult> {
  if (!input.trusted) {
    return { kind: 'untrusted', message: UNTRUSTED_WORKSPACE_MESSAGE };
  }
  const files = await input.listBlueprints();
  const map = selectArchitectureMap(files);
  if (!map) {
    return { kind: 'empty', message: NO_MAP_MESSAGE };
  }
  return { kind: 'map', map };
}

export function renderArchitectureMapPanel(
  result: Exclude<OpenArchitectureMapResult, { kind: 'untrusted' }>
): string {
  if (result.kind === 'empty') {
    return panelDocument('Architecture map', `<p>${escapeHtml(result.message)}</p>`);
  }
  if (result.kind === 'map') {
    const systems = result.map.systems
      .map(system => `<li><button type="button">${escapeHtml(system.name)}</button></li>`)
      .join('');
    const links = result.map.links
      .map(link => `<li>${escapeHtml(link.fromName)} → ${escapeHtml(link.toName)}</li>`)
      .join('');
    return panelDocument(
      result.map.name,
      `<h1>${escapeHtml(result.map.name)}</h1>
<ul aria-label="Systems">${systems}</ul>
<h2>Links</h2>
<ul aria-label="Links">${links}</ul>`
    );
  }
  return assertNever(result);
}

export interface GenerateFromWorkspaceInput {
  trusted: boolean;
  enabled: boolean;
  listBlueprints: () => Promise<readonly BlueprintFile[]>;
  scan: () => void;
  write: () => void;
  ask: (prompt: typeof GENERATE_PROMPT) => Promise<GeneratePromptAction>;
  openDiscussion: (url: string) => Promise<void>;
}

export type GenerateFromWorkspaceResult =
  | { kind: 'untrusted'; message: typeof UNTRUSTED_WORKSPACE_MESSAGE }
  | { kind: 'discussion-opened'; url: typeof GENERATE_INTEREST_DISCUSSION_URL }
  | { kind: 'dismissed' }
  | { kind: 'enabled-without-scan' };

export async function generateFromWorkspace(
  input: GenerateFromWorkspaceInput
): Promise<GenerateFromWorkspaceResult> {
  if (!input.trusted) {
    return { kind: 'untrusted', message: UNTRUSTED_WORKSPACE_MESSAGE };
  }
  if (!input.enabled) {
    const action = await input.ask(GENERATE_PROMPT);
    if (action === 'tell-us') {
      await input.openDiscussion(GENERATE_INTEREST_DISCUSSION_URL);
      return { kind: 'discussion-opened', url: GENERATE_INTEREST_DISCUSSION_URL };
    }
    if (action === 'cancel' || action === 'escape') {
      return { kind: 'dismissed' };
    }
    return assertNever(action);
  }
  return { kind: 'enabled-without-scan' };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected generate prompt action: ${String(value)}`);
}

function selectArchitectureMap(files: readonly BlueprintFile[]): ArchitectureMap | null {
  const parsed: Array<{ level: string; map: ArchitectureMap }> = [];
  for (const file of files) {
    const read = tryReadBlueprint(file.content);
    if (read) parsed.push(read);
  }
  const context = parsed.find(item => item.level === 'context');
  return (context ?? parsed[0])?.map ?? null;
}

function tryReadBlueprint(content: string): { level: string; map: ArchitectureMap } | null {
  try {
    const schema = parseSchemaFromYaml(content);
    const nameByRef = new Map(schema.nodes.map(node => [node.entityRef, node.name]));
    return {
      level: schema.level,
      map: {
        name: schema.name,
        systems: schema.nodes.map(node => ({ name: node.name, entityRef: node.entityRef })),
        links: schema.dependencies.map(link => ({
          fromName: nameByRef.get(link.from) ?? link.from,
          toName: nameByRef.get(link.to) ?? link.to,
        })),
      },
    };
  } catch {
    return null;
  }
}

function panelDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<title>${escapeHtml(title)}</title>
<style>
  body { background: #ffffff; color: #1a1a1a; font-family: sans-serif; }
  button { background: #f4f4f5; color: #1a1a1a; border: 1px solid #5c5c5c; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
