export type RollbackPlan =
  { action: 'none' } | { action: 'restore'; previousId: string } | { action: 'fail-loud' };

type PagesDeployment = {
  id?: unknown;
  environment?: unknown;
  latest_stage?: { status?: unknown };
};

type WorkerDeployment = {
  versions?: Array<{ version_id?: unknown; percentage?: unknown }>;
};

function readId(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function pickPreviousPagesDeploymentId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const result = (body as { result?: unknown }).result;
  if (!Array.isArray(result)) return null;
  for (const row of result) {
    if (typeof row !== 'object' || row === null) continue;
    const deployment = row as PagesDeployment;
    if (deployment.environment !== 'production') continue;
    if (deployment.latest_stage?.status !== 'success') continue;
    const id = readId(deployment.id);
    if (id) return id;
  }
  return null;
}

export function pickPreviousWorkerVersionId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const result = (body as { result?: unknown }).result;
  const deployments = Array.isArray(result)
    ? result
    : typeof result === 'object' && result !== null
      ? (result as { deployments?: unknown }).deployments
      : undefined;
  if (!Array.isArray(deployments) || deployments.length === 0) return null;
  const newest = deployments[0];
  if (typeof newest !== 'object' || newest === null) return null;
  const versions = (newest as WorkerDeployment).versions;
  if (!Array.isArray(versions)) return null;
  const full = versions.find(version => version.percentage === 100);
  return readId(full?.version_id);
}

export function rollbackPlan(input: { smokeOk: boolean; previousId: string | null }): RollbackPlan {
  if (input.smokeOk) return { action: 'none' };
  if (input.previousId) return { action: 'restore', previousId: input.previousId };
  return { action: 'fail-loud' };
}
