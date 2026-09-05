export function extractTerraformFromMarkdown(text: string): string {
  const fence = /```(?:hcl|tf|terraform)?[ \t]*\n([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) return fence[1].trim();
  return text.trim();
}
