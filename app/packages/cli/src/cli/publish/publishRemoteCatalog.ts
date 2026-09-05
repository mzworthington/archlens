import {
  createObjectStorage,
  resolveObjectStorageConfigFromEnv,
  uploadRemoteCatalogSnapshot,
  type ObjectStoragePort,
} from '@archlens/storage';

export type RemoteCatalogPublishResult = {
  revisionId: string;
  provider: string;
  uploadedObjects: number;
};

export type PublishObjectStorageOverrides = {
  provider?: 'r2' | 's3' | 'azure';
  bucket?: string;
  accountId?: string;
  keyPrefix?: string;
};

export function resolvePublishObjectStorage(
  overrides: PublishObjectStorageOverrides = {}
): ObjectStoragePort | null {
  const config = resolveObjectStorageConfigFromEnv();
  if (!config || config.provider === 'http') {
    return null;
  }

  if (config.provider === 'azure') {
    return createObjectStorage({
      ...config,
      container: overrides.bucket ?? config.container,
      keyPrefix: overrides.keyPrefix ?? config.keyPrefix,
    });
  }

  const provider =
    overrides.provider === 's3' ? 's3' : overrides.provider === 'r2' ? 'r2' : config.provider;

  return createObjectStorage({
    ...config,
    provider,
    bucket: overrides.bucket ?? config.bucket,
    endpoint:
      overrides.accountId && provider === 'r2'
        ? `https://${overrides.accountId}.r2.cloudflarestorage.com`
        : config.endpoint,
    keyPrefix: overrides.keyPrefix ?? config.keyPrefix,
  });
}

export { uploadRemoteCatalogSnapshot };
