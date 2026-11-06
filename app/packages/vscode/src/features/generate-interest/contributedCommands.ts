export interface ContributedCommand {
  command: string;
  title: string;
  category: 'ArchLens';
}

const openMap: ContributedCommand = {
  command: 'archlens.openArchitectureMap',
  title: 'Open architecture map',
  category: 'ArchLens',
};

const generate: ContributedCommand = {
  command: 'archlens.generateDiagramFromWorkspace',
  title: 'Generate diagram from workspace',
  category: 'ArchLens',
};

/** Kill keeps the preview and removes generate. */
export function contributedCommands(release: { generateRemoved: boolean }): ContributedCommand[] {
  if (release.generateRemoved) return [openMap];
  return [openMap, generate];
}
