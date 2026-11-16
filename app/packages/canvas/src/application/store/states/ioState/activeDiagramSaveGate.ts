/**
 * Generation gate for an in-flight active-diagram disk write.
 * Keep disk bumps the epoch so a quiet autosave cannot commit the draft
 * the user just discarded, then waits out that write and restores disk.
 */
let epoch = 0;
let diskWritesInFlight = 0;
let savesBlocked = false;
const pending = new Set<Promise<void>>();

export function readActiveDiagramSaveEpoch(): number {
  return epoch;
}

export function areActiveDiagramSavesBlocked(): boolean {
  return savesBlocked;
}

export function beginActiveDiagramDiskWrite(): void {
  diskWritesInFlight += 1;
}

export function endActiveDiagramDiskWrite(): void {
  diskWritesInFlight = Math.max(0, diskWritesInFlight - 1);
}

/** Track a workspace save so Keep disk can wait until its disk write settles. */
export function trackActiveDiagramSave<T>(task: Promise<T>): Promise<T> {
  const settled = task.then(
    () => undefined,
    () => undefined
  );
  pending.add(settled);
  void settled.then(() => {
    pending.delete(settled);
  });
  return task;
}

export function supersedeActiveDiagramSave(): {
  settled: Promise<void>;
  diskWriteWasActive: boolean;
} {
  epoch += 1;
  savesBlocked = true;
  const diskWriteWasActive = diskWritesInFlight > 0;
  const inflight = [...pending];
  return {
    diskWriteWasActive,
    settled: Promise.all(inflight).then(
      () => undefined,
      () => undefined
    ),
  };
}

export function resumeActiveDiagramSaves(): void {
  savesBlocked = false;
}

/** Test helper - reset between cases. */
export function resetActiveDiagramSaveGateForTests(): void {
  epoch = 0;
  diskWritesInFlight = 0;
  savesBlocked = false;
  pending.clear();
}
