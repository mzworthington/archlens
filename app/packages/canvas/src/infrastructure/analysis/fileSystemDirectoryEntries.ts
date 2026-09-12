function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFileSystemHandle(value: unknown): value is FileSystemHandle {
  return (
    isRecord(value) &&
    (value.kind === 'file' || value.kind === 'directory') &&
    typeof value.name === 'string'
  );
}

function isNamedHandlePair(value: unknown): value is [string, FileSystemHandle] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'string' &&
    isFileSystemHandle(value[1])
  );
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return isRecord(value) && Symbol.asyncIterator in value;
}

export async function* iterateDirectoryEntries(
  dir: FileSystemDirectoryHandle
): AsyncGenerator<readonly [string, FileSystemHandle]> {
  if (typeof dir.entries === 'function') {
    for await (const pair of dir.entries()) {
      yield pair;
    }
    return;
  }

  if (!isAsyncIterable(dir)) return;

  const fallback: AsyncIterable<unknown> = dir;
  for await (const entry of fallback) {
    if (isNamedHandlePair(entry)) {
      yield entry;
      continue;
    }
    if (isFileSystemHandle(entry)) {
      yield [entry.name, entry];
    }
  }
}

export async function listDirectoryNames(dir: FileSystemDirectoryHandle): Promise<string[]> {
  const names: string[] = [];
  for await (const [name] of iterateDirectoryEntries(dir)) {
    names.push(name);
  }
  return names;
}
