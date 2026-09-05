import { slugify } from './slug.ts';

export type C4Level = 'context' | 'container' | 'component' | 'code';

export type EntityRef = string;

export const EntityRef = {
  create(...parts: string[]): EntityRef {
    const cleanParts = parts.filter(Boolean).map(p => slugify(p));
    if (cleanParts.length === 0)
      throw new Error('At least one part is required to create an EntityRef.');
    return cleanParts.join('/');
  },

  getLevel(ref: EntityRef): C4Level {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length === 0 || segments.length > 4) {
      throw new Error(`Invalid EntityRef structure layout: ${ref}`);
    }
    switch (segments.length) {
      case 1:
        return 'context';
      case 2:
        return 'container';
      case 3:
        return 'component';
      default:
        return 'code';
    }
  },

  parse(value: string, parent?: EntityRef): EntityRef {
    if (!value?.trim()) throw new Error('Value is required.');
    if (parent) {
      return this.child(parent, value);
    }
    return slugify(value);
  },

  child(parent: EntityRef, child: string): EntityRef {
    if (!parent?.trim()) throw new Error('Parent EntityRef is required.');
    if (!child?.trim()) throw new Error('Child identifier is required.');
    return `${parent}/${slugify(child)}`;
  },

  getContainerId(ref: EntityRef): string {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length < 2) {
      throw new Error('EntityRef is not at container or component level: ' + ref);
    }
    if (segments.length >= 3) {
      return segments[segments.length - 2];
    }
    return segments[segments.length - 1];
  },

  getParent(ref: EntityRef): EntityRef | null {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length <= 1) {
      return null;
    }
    return segments.slice(0, -1).join('/');
  },

  leaf(ref: EntityRef): string {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length === 0) return '';
    return segments[segments.length - 1];
  },

  getImpactedDomainGroup(ref: EntityRef): string {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length === 0) return ref;
    if (segments.length <= 2) return segments[0];
    return segments[segments.length - 2];
  },
};
