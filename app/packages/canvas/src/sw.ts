import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import {
  addPlugins,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { shellPrecacheRequest } from './application/pwa/shellPrecacheRequest';

// Register before precacheAndRoute so the install fetch of `/` asks for HTML.
// Cloudflare injects the Web Analytics beacon only when Accept includes text/html.
addPlugins([
  {
    requestWillFetch: async ({ request }: { request: Request }) => shellPrecacheRequest(request),
  },
]);

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Pages pretty-URLs 308 the root HTML file. A redirected navigation fallback fails install.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/'), {
    denylist: [
      /^\/schemas\//,
      /^\/bundled-blueprints\//,
      /^\/bundled-chaos-specs\//,
      /^\/assets\//,
      /^\/sitemap\.xml$/,
      /^\/robots\.txt$/,
      /^\/version\.json$/,
    ],
  })
);

const weekSeconds = 60 * 60 * 24 * 7;

function cacheFirst(cacheName: string, maxEntries: number): CacheFirst {
  return new CacheFirst({
    cacheName,
    plugins: [
      new ExpirationPlugin({ maxEntries, maxAgeSeconds: weekSeconds }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  });
}

registerRoute(({ url }) => url.pathname.endsWith('.wasm'), cacheFirst('wasm-binaries', 20));
registerRoute(
  ({ url }) => url.pathname.includes('/bundled-blueprints/'),
  cacheFirst('bundled-blueprints', 2000)
);
registerRoute(
  ({ url }) => url.pathname.includes('/bundled-chaos-specs/'),
  cacheFirst('bundled-chaos-specs', 200)
);
