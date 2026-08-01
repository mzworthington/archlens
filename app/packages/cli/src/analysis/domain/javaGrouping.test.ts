import { describe, it, expect } from 'vitest';
import { resolveJavaComponent } from './javaGrouping.ts';

describe('javaGrouping', () => {
  describe('resolveJavaComponent', () => {
    it('returns null for boilerplate files', () => {
      expect(resolveJavaComponent('src/main/java/com/acme/generated/Foo.java', 'Foo')).toBeNull();
    });

    it('rolls up files by package folder under src/main/java', () => {
      expect(
        resolveJavaComponent('src/main/java/com/acme/orders/OrderService.java', 'OrderService')
      ).toEqual({
        componentId: 'orders',
        componentName: 'Orders',
      });

      expect(
        resolveJavaComponent(
          'src/main/java/com/acme/orders/api/OrderController.java',
          'OrderController'
        )
      ).toEqual({
        componentId: 'orders/api',
        componentName: 'Api',
      });
    });

    it('falls back to namespace declaration when path layout is missing', () => {
      expect(
        resolveJavaComponent('lib/OrderService.java', 'OrderService', ['com.acme.orders'])
      ).toEqual({
        componentId: 'orders',
        componentName: 'Orders',
      });
    });
  });
});
