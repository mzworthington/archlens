import { describe, it, expect } from 'vitest';
import { EntityRef } from './entityRefIdentity';

describe('EntityRef identity parsing', () => {
  describe('parse()', () => {
    it('should correctly parse and slugify a root context reference when parent is not provided', () => {
      expect(EntityRef.parse('My Context')).toBe('my-context');
    });

    it('should throw an error if the value input is missing or empty', () => {
      expect(() => EntityRef.parse('')).toThrowError(/Value is required/);
      expect(() => EntityRef.parse('   ')).toThrowError(/Value is required/);
    });
  });

  describe('getLevel()', () => {
    it('should throw an error if evaluated path exceeds 4 segments or has no segments', () => {
      expect(() => EntityRef.getLevel('')).toThrowError(/Invalid EntityRef structure layout/);
      expect(() => EntityRef.getLevel('one/two/three/four/five')).toThrowError(
        /Invalid EntityRef structure layout/
      );
    });
  });
});
