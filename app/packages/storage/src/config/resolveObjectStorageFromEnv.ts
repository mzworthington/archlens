import type { ObjectStorageConfig } from './objectStorageConfig';

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function resolveObjectStorageConfigFromEnv(): ObjectStorageConfig | null {
  const provider = (process.env.OBJECT_STORAGE_PROVIDER ?? process.env.STORAGE_PROVIDER ?? 'r2')
    .trim()
    .toLowerCase();

  const keyPrefix = firstDefined(
    process.env.OBJECT_STORAGE_KEY_PREFIX,
    process.env.R2_CATALOG_KEY_PREFIX,
    process.env.STORAGE_KEY_PREFIX
  );

  if (provider === 'azure') {
    const container = firstDefined(
      process.env.AZURE_STORAGE_CONTAINER,
      process.env.OBJECT_STORAGE_BUCKET,
      process.env.STORAGE_BUCKET
    );
    const connectionString = firstDefined(process.env.AZURE_STORAGE_CONNECTION_STRING);
    const accountUrl = firstDefined(process.env.AZURE_STORAGE_ACCOUNT_URL);
    const sasToken = firstDefined(process.env.AZURE_STORAGE_SAS_TOKEN);
    if (!container || (!connectionString && !(accountUrl && sasToken))) {
      return null;
    }
    return {
      provider: 'azure',
      container,
      connectionString,
      accountUrl,
      sasToken,
      keyPrefix,
    };
  }

  if (provider === 'http') {
    const baseUrl = firstDefined(process.env.OBJECT_STORAGE_BASE_URL, process.env.STORAGE_BASE_URL);
    if (!baseUrl) return null;
    return { provider: 'http', baseUrl };
  }

  const bucket = firstDefined(
    process.env.OBJECT_STORAGE_BUCKET,
    process.env.R2_BUCKET,
    process.env.AWS_S3_BUCKET,
    process.env.STORAGE_BUCKET
  );
  const accessKeyId = firstDefined(
    process.env.OBJECT_STORAGE_ACCESS_KEY_ID,
    process.env.R2_ACCESS_KEY_ID,
    process.env.AWS_ACCESS_KEY_ID
  );
  const secretAccessKey = firstDefined(
    process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
    process.env.R2_SECRET_ACCESS_KEY,
    process.env.AWS_SECRET_ACCESS_KEY
  );

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  if (provider === 's3') {
    return {
      provider: 's3',
      bucket,
      accessKeyId,
      secretAccessKey,
      region: firstDefined(process.env.AWS_REGION, process.env.AWS_DEFAULT_REGION) ?? 'us-east-1',
      endpoint: firstDefined(process.env.AWS_ENDPOINT_URL, process.env.S3_ENDPOINT),
      keyPrefix,
    };
  }

  const accountId = firstDefined(process.env.R2_ACCOUNT_ID, process.env.CLOUDFLARE_ACCOUNT_ID);
  if (!accountId) return null;

  return {
    provider: 'r2',
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    region: 'auto',
    keyPrefix,
  };
}
