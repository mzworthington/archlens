/** Suggested YAML filename for a closed-folder (Ideate / single-file) diagram name. */
export function yamlFileNameFromDiagramName(name: string): string {
  const sanitized =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_') || 'blueprint';
  return `${sanitized}.yaml`;
}
