export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export function parseSemVer(tag: string): SemVer | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(tag.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/** Returns positive when `left` is newer than `right`. */
export function compareSemVer(left: string, right: string): number {
  const a = parseSemVer(left);
  const b = parseSemVer(right);
  if (!a || !b) return 0;
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

export function isNewerVersion(latest: string, current: string): boolean {
  return compareSemVer(latest, current) > 0;
}
