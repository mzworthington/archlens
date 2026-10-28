/**
 * Workbox precaches the `/` shell without asking for HTML. Cloudflare injects
 * the Web Analytics beacon only when Accept includes text/html, so that cached
 * shell is what return visits render, without a beacon. Other precache URLs
 * keep their original request so Pages does not answer them with the HTML shell.
 */
export function shellPrecacheRequest(request: Request): Request {
  const url = new URL(request.url);
  if (url.pathname !== '/') return request;

  const headers = new Headers(request.headers);
  if (headers.get('Accept')?.includes('text/html')) return request;

  headers.set('Accept', 'text/html');
  return new Request(request, { headers });
}
