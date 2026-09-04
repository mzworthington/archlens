import type { ObjectStorageProvider } from '../ports/objectStoragePort';

export type S3CompatibleStorageConfig = {
  provider: 'r2' | 's3';
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** R2: `https://{accountId}.r2.cloudflarestorage.com`. S3: optional custom endpoint. */
  endpoint?: string;
  region?: string;
  keyPrefix?: string;
};

export type AzureBlobStorageConfig = {
  provider: 'azure';
  container: string;
  connectionString?: string;
  accountUrl?: string;
  sasToken?: string;
  keyPrefix?: string;
};

export type HttpObjectStorageConfig = {
  provider: 'http';
  baseUrl: string;
  fetchImpl?: typeof fetch;
  /** Injectable delay between transient HTTP retries (tests). */
  sleep?: (ms: number) => Promise<void>;
};

export type ObjectStorageConfig =
  S3CompatibleStorageConfig | AzureBlobStorageConfig | HttpObjectStorageConfig;

export function isWritableStorageProvider(
  provider: ObjectStorageProvider
): provider is 'r2' | 's3' | 'azure' {
  return provider === 'r2' || provider === 's3' || provider === 'azure';
}
