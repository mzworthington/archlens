# @archlens/storage

Hexagonal object storage port shared by the CLI (publish) and Canvas (read).

## Port

`ObjectStoragePort` — `getObject`, `getObjectText`, `putObject`

## Adapters

| Provider | Adapter                        | Typical use                           |
| -------- | ------------------------------ | ------------------------------------- |
| `r2`     | `createS3ObjectStorage`        | Dogfood publish (Cloudflare R2)       |
| `s3`     | `createS3ObjectStorage`        | Customer AWS buckets                  |
| `azure`  | `createAzureBlobObjectStorage` | Customer Azure Blob containers        |
| `http`   | `createHttpObjectStorage`      | Read-only public CDN (Canvas sandbox) |

## CLI

```bash
OBJECT_STORAGE_PROVIDER=r2 \
OBJECT_STORAGE_BUCKET=archlens-blueprint-catalog \
R2_ACCOUNT_ID=... \
R2_ACCESS_KEY_ID=... \
R2_SECRET_ACCESS_KEY=... \
archlens publish blueprints/ --no-dry-run
```

## Designer

Remote sandbox reads via the HTTP adapter (`@archlens/storage/http`) so the browser bundle does not include AWS/Azure SDKs.
