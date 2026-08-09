import {
  estateFragmentManifestKey,
  estateFragmentObjectKey,
  parseEstateFragmentManifest,
  selectLatestFragmentManifestsByKey,
  serializeEstateFragmentManifest,
  type EstateFragment,
  type EstateFragmentManifest,
} from '@archlens/core';
import type { ObjectStoragePort } from '../ports/objectStoragePort';
import { uploadObjects } from '../lib/uploadObjects';

export type UploadEstateFragmentResult = {
  fragmentKey: string;
  runId: string;
  provider: ObjectStoragePort['provider'];
  uploadedObjects: number;
  manifestKey: string;
};

/**
 * Stage an estate fragment under `fragments/{key}/{runId}/` (ADR-0014).
 */
export async function uploadEstateFragment(
  fragment: EstateFragment,
  storage: ObjectStoragePort
): Promise<UploadEstateFragmentResult> {
  const manifest: EstateFragmentManifest = {
    version: fragment.version,
    estateId: fragment.estateId,
    productId: fragment.productId,
    ...(fragment.systemId ? { systemId: fragment.systemId } : {}),
    fragmentKey: fragment.fragmentKey,
    sourceRef: fragment.sourceRef,
    runId: fragment.runId,
    publishedAt: fragment.publishedAt,
    objectPaths: fragment.objects.map(object => object.path),
  };

  const objects = [
    ...fragment.objects.map(object => ({
      key: estateFragmentObjectKey(fragment.fragmentKey, fragment.runId, object.path),
      body: object.content,
      contentType: 'application/yaml',
    })),
    {
      key: estateFragmentManifestKey(fragment.fragmentKey, fragment.runId),
      body: serializeEstateFragmentManifest(manifest),
      contentType: 'application/json',
    },
  ];

  const result = await uploadObjects(storage, objects, {
    writeLastKeys: [estateFragmentManifestKey(fragment.fragmentKey, fragment.runId)],
  });

  return {
    fragmentKey: fragment.fragmentKey,
    runId: fragment.runId,
    provider: storage.provider,
    uploadedObjects: result.uploadedObjects,
    manifestKey: estateFragmentManifestKey(fragment.fragmentKey, fragment.runId),
  };
}

/**
 * Load the freshest fragment run per `fragmentKey` under `fragments/`.
 *
 * Manifests for every run are read so freshness can be decided; YAML object
 * bodies are fetched only for the selected (latest) runs - older staged runs
 * are ignored to cut compose read fan-out against object storage.
 */
export async function loadEstateFragmentsFromStorage(
  storage: ObjectStoragePort
): Promise<EstateFragment[]> {
  const keys = await storage.listObjectKeys('fragments/');
  const manifestKeys = keys.filter(key => key.endsWith('/manifest.json'));
  const manifests: EstateFragmentManifest[] = [];

  for (const manifestKey of manifestKeys) {
    const raw = JSON.parse(await storage.getObjectText(manifestKey)) as unknown;
    manifests.push(parseEstateFragmentManifest(raw));
  }

  const selected = selectLatestFragmentManifestsByKey(manifests);
  const fragments: EstateFragment[] = [];

  for (const manifest of selected) {
    const objects = await Promise.all(
      manifest.objectPaths.map(async path => ({
        path,
        content: await storage.getObjectText(
          estateFragmentObjectKey(manifest.fragmentKey, manifest.runId, path)
        ),
      }))
    );
    fragments.push({ ...manifest, objects });
  }

  return fragments;
}
