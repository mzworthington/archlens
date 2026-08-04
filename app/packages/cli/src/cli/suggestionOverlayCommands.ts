import fs from 'node:fs/promises';
import path from 'node:path';
import { parseSuggestionOverlayYaml, type SuggestionOverlay } from '@archlens/core';
import {
  rejectSuggestionOverlayInStorage,
  uploadSuggestionOverlay,
  type ObjectStoragePort,
  type UploadSuggestionOverlayResult,
} from '@archlens/storage';
import type {
  CatalogAcceptOverlayCliPlan,
  CatalogRejectOverlayCliPlan,
} from './parseArchlensArgv.ts';

export type AcceptOverlayDeps = {
  readOverlayFile: (filePath: string) => Promise<string>;
  resolveStorage: (plan: CatalogAcceptOverlayCliPlan) => ObjectStoragePort | null;
};

export type RejectOverlayDeps = {
  resolveStorage: (plan: CatalogRejectOverlayCliPlan) => ObjectStoragePort | null;
  now?: () => Date;
};

export type AcceptOverlayOutcome =
  | { kind: 'storage-not-configured' }
  | { kind: 'estate-mismatch'; overlayEstateId: string }
  | { kind: 'dry-run'; overlay: SuggestionOverlay }
  | { kind: 'uploaded'; overlay: SuggestionOverlay; result: UploadSuggestionOverlayResult };

export type RejectOverlayOutcome =
  | { kind: 'storage-not-configured' }
  | { kind: 'dry-run'; overlayId: string }
  | { kind: 'rejected'; result: UploadSuggestionOverlayResult };

export async function runAcceptOverlay(
  plan: CatalogAcceptOverlayCliPlan,
  deps: AcceptOverlayDeps
): Promise<AcceptOverlayOutcome> {
  const absolute = path.resolve(process.cwd(), plan.overlayFile);
  const content = await deps.readOverlayFile(absolute);
  const parsed = parseSuggestionOverlayYaml(content);
  if (parsed.estateId !== plan.estateId) {
    return { kind: 'estate-mismatch', overlayEstateId: parsed.estateId };
  }
  const overlay: SuggestionOverlay = {
    version: parsed.version,
    overlayId: parsed.overlayId,
    estateId: parsed.estateId,
    status: 'accepted',
    kind: parsed.kind,
    targetPath: parsed.targetPath,
    sourceRef: parsed.sourceRef,
    acceptedAt: parsed.acceptedAt,
    ...(parsed.recommendationId ? { recommendationId: parsed.recommendationId } : {}),
    delta: parsed.delta,
  };

  if (plan.dryRun) {
    return { kind: 'dry-run', overlay };
  }

  const storage = deps.resolveStorage(plan);
  if (!storage) return { kind: 'storage-not-configured' };

  const result = await uploadSuggestionOverlay(overlay, storage);
  return { kind: 'uploaded', overlay, result };
}

export async function runRejectOverlay(
  plan: CatalogRejectOverlayCliPlan,
  deps: RejectOverlayDeps
): Promise<RejectOverlayOutcome> {
  if (plan.dryRun) {
    return { kind: 'dry-run', overlayId: plan.overlayId };
  }

  const storage = deps.resolveStorage(plan);
  if (!storage) return { kind: 'storage-not-configured' };

  const rejectedAt = (deps.now ?? (() => new Date()))().toISOString();
  const result = await rejectSuggestionOverlayInStorage(storage, plan.overlayId, rejectedAt);
  return { kind: 'rejected', result };
}

export async function readOverlayFileFromDisk(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf8');
}
