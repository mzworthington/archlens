export const DESIGN_SYSTEM_SECTIONS = [
  { id: 'identity', label: 'Identity & grid' },
  { id: 'tokens', label: 'Design tokens' },
  { id: 'assets', label: 'Vector assets' },
  { id: 'components', label: 'UI components' },
  { id: 'sandbox', label: 'Interactive sandbox' },
] as const;

export type DesignSystemSectionId = (typeof DESIGN_SYSTEM_SECTIONS)[number]['id'];

export function isDesignSystemSectionId(value: string): value is DesignSystemSectionId {
  return DESIGN_SYSTEM_SECTIONS.some(section => section.id === value);
}
