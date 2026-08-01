import { describe, it, expect } from 'vitest';
import { resolveGoComponent } from './goGrouping.ts';

describe('goGrouping', () => {
  describe('resolveGoComponent', () => {
    it('rolls up by meaningful package directory', () => {
      expect(resolveGoComponent('internal/resilience/engine.go', 'engine')).toEqual({
        componentId: 'resilience',
        componentName: 'Resilience',
      });

      expect(resolveGoComponent('internal/orders/handler.go', 'handler')).toEqual({
        componentId: 'orders',
        componentName: 'Orders',
      });
    });

    it('skips generic top-level dirs and uses the package folder', () => {
      expect(resolveGoComponent('pkg/store/store.go', 'store')).toEqual({
        componentId: 'store',
        componentName: 'Store',
      });

      expect(resolveGoComponent('cmd/server/main.go', 'main')).toEqual({
        componentId: 'server',
        componentName: 'Server',
      });
    });
  });
});
