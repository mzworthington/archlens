import type { SystemSchema } from '@archlens/core';
import type { BlueprintDocument, ReviewRow } from './domain';

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
export type ScanScopeChoice = 'workspace' | 'folder' | 'custom' | 'escape';
export type ScanOutcome = 'ready' | 'cancelled' | 'failed';
export type ReviewChoice = 'keep' | 'write' | 'escape';

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
  showEmptyMap(): void;
  askGenerateInterest(): Promise<GenerateChoice>;
  openDiscussion(url: string): Promise<void>;
  visibleSchema(): SystemSchema | undefined;
  writeClipboard(text: string): Promise<void>;
  visibleMap(): { readonly hotspotsOn: boolean; readonly workspaceRoot?: string } | undefined;
  hasGitHistory(root: string): Promise<boolean>;
  setHotspots(on: boolean): void;
  listSourceFiles(root: string, glob: string): Promise<readonly string[]>;
  askScanScope(found: string): Promise<ScanScopeChoice>;
  askScanGlob(): Promise<string | undefined>;
  confirmGenerate(): Promise<'generate' | 'cancel'>;
  scanFolder(root: string): Promise<ScanOutcome>;
  unsavedBlueprint(): boolean;
  showReview(rows: readonly ReviewRow[]): Promise<ReviewChoice>;
  applyBlueprintWrite(documents: readonly BlueprintDocument[]): Promise<'written' | 'failed'>;
}
