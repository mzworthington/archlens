import {
  parseSuggestionOverlayYaml,
  serializeSuggestionOverlay,
  suggestionOverlayObjectKey,
  tombstoneSuggestionOverlay,
  type SuggestionOverlay,
} from '@archlens/core';
import type { ObjectStoragePort } from '../ports/objectStoragePort';

export type UploadSuggestionOverlayResult = {
  overlayId: string;
  key: string;
  provider: ObjectStoragePort['provider'];
};

/**
 * Write an accepted (or tombstoned) suggestion overlay under `overlays/{id}.yaml`.
 */
export async function uploadSuggestionOverlay(
  overlay: SuggestionOverlay,
  storage: ObjectStoragePort
): Promise<UploadSuggestionOverlayResult> {
  const key = suggestionOverlayObjectKey(overlay.overlayId);
  await storage.putObject({
    key,
    body: serializeSuggestionOverlay(overlay),
    contentType: 'application/yaml',
  });
  return { overlayId: overlay.overlayId, key, provider: storage.provider };
}

/**
 * Load every overlay document under `overlays/`.
 */
export async function loadSuggestionOverlaysFromStorage(
  storage: ObjectStoragePort
): Promise<SuggestionOverlay[]> {
  const keys = await storage.listObjectKeys('overlays/');
  const overlayKeys = keys.filter(key => key.endsWith('.yaml') || key.endsWith('.yml'));
  const overlays: SuggestionOverlay[] = [];
  for (const key of overlayKeys) {
    const content = await storage.getObjectText(key);
    overlays.push(parseSuggestionOverlayYaml(content));
  }
  return overlays;
}

export async function rejectSuggestionOverlayInStorage(
  storage: ObjectStoragePort,
  overlayId: string,
  rejectedAt: string
): Promise<UploadSuggestionOverlayResult> {
  const key = suggestionOverlayObjectKey(overlayId);
  const existing = parseSuggestionOverlayYaml(await storage.getObjectText(key));
  const tombstone = tombstoneSuggestionOverlay(existing, rejectedAt);
  return uploadSuggestionOverlay(tombstone, storage);
}
