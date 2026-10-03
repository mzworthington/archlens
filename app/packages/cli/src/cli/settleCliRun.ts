export function settleCliRun(pending: Promise<void>): void {
  void pending.catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
