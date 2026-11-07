import type { SystemSchema } from '@archlens/core';

export interface BlueprintFile {
  readonly path: string;
  readonly content: string;
}

export interface DiagramSystem {
  readonly name: string;
  readonly entityRef: string;
  readonly sourceFile?: string;
  readonly hotspotCount?: number;
}

export interface DiagramLink {
  readonly fromName: string;
  readonly toName: string;
}

export interface DiagramCrumb {
  readonly name: string;
  readonly sourcePath: string;
}

export interface DiagramView {
  readonly sourcePath: string;
  readonly level: 'context' | 'container' | 'component' | 'code';
  readonly systems: readonly DiagramSystem[];
  readonly links: readonly DiagramLink[];
  readonly breadcrumb?: readonly DiagramCrumb[];
}

export interface WorkspaceFolder {
  readonly name: string;
  readonly path: string;
}

export type GenerateChoice = 'tell' | 'cancel' | 'escape';

export interface FocusedSystem {
  readonly name: string;
  readonly sourceFile?: string;
  readonly workspaceRoot?: string;
}

export interface EditorHost {
  isTrusted(): boolean;
  generateEnabled(): boolean;
  selectedPath(): string | undefined;
  selectedFolder(): string | undefined;
  /** Path of the focused editor when the command was not aimed at a file or folder. */
  hintPath(): string | undefined;
  workspaceFolders(): readonly WorkspaceFolder[];
  pickFolder(folders: readonly WorkspaceFolder[]): Promise<string | undefined>;
  readSelectedFile(): Promise<readonly BlueprintFile[]>;
  listBlueprintFiles(folderPath: string): Promise<readonly BlueprintFile[]>;
  blueprintsFolder(): string;
  showMessage(message: string): void;
  showDiagram(diagram: DiagramView): Promise<void>;
  askGenerateInterest(): Promise<GenerateChoice>;
  openDiscussion(url: string): Promise<void>;
  focusedSystem(): FocusedSystem | undefined;
  fileExists(path: string): Promise<boolean>;
  openFile(path: string): Promise<void>;
  setStatus(message: string): void;
  visibleSchema(): SystemSchema | undefined;
  writeClipboard(text: string): Promise<void>;
  visibleMap(): { readonly hotspotsOn: boolean; readonly workspaceRoot?: string } | undefined;
  hasGitHistory(root: string): Promise<boolean>;
  setHotspots(on: boolean): void;
}
