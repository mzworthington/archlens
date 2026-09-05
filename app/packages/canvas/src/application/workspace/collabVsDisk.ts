export function shouldPreviewCollabVsDisk(input: {
  collabActive: boolean;
  isWorkspaceOpen: boolean;
}): boolean {
  return input.collabActive && input.isWorkspaceOpen;
}

export function keepDiskRequiresRoomPush(collabActive: boolean): boolean {
  return collabActive;
}
