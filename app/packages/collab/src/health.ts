export function isCollabHealthPath(pathname: string): boolean {
  return pathname === '/health' || pathname === '/health/';
}

export function collabHealthResponse(sha: string | undefined): Response {
  const body = JSON.stringify({ ok: true, sha: sha && sha.length > 0 ? sha : 'local' });
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
