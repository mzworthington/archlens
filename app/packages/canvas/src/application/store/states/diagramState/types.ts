import type { UiState } from '../uiState';
import type { IoState } from '../ioState';
import type {
  SchemaVersionAssessment,
  SystemSchema,
  SystemNode,
  SystemDependency,
  NodeType,
  C4Level,
  ValidationResult,
  ConflictResolutions,
  ExternalCandidateFilters,
  WorkspaceEntity,
  WorkspaceCatalogEntry,
} from '@archlens/core';
import type { IacSourceFile, IacSourceKind } from '@archlens/core/import-iac';
import type { CanvasNodeChange, CanvasEdgeChange, CanvasConnection } from '../../../../core';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../layoutUtils';
import type { MermaidImportPreview } from './importMermaid';
import type { IacImportPreview } from './importIac';
import type { RefactorBoundary } from '@archlens/core/forensics';

export type SelectionOptions = {
  /** Expand the property panel even on mobile (e.g. shared deep links). */
  expandPanel?: boolean;
};

export interface DiagramState {
  schema: SystemSchema;
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  validationResult: ValidationResult;
  yamlCode: string;
  lastError: string | null;
  schemaVersionWarning: SchemaVersionAssessment | null;
  currentFilePath: string;
  isWorkspaceOpen: boolean;
  /** Bundled Samples workspace (read-only; save downloads YAML). */
  isSampleWorkspace: boolean;
  /**
   * Workspace came from in-browser structural scan (no git TraceLens / CLI forensics).
   * Cleared when opening a folder, sample, or empty workspace.
   */
  isBrowserLiteWorkspace: boolean;
  workspaceName: string;
  /** Lightweight workspace index (all diagrams). Full schemas live in loadedSystems. */
  workspaceCatalog: WorkspaceCatalogEntry[];
  loadedSystems: Array<{ path: string; name: string; schema: SystemSchema }>;
  nodeRefMap: Record<string, Record<string, string>>;
  past: Array<{ nodes: BlueprintRFNode[]; edges: BlueprintRFEdge[]; schema: SystemSchema }>;
  future: Array<{ nodes: BlueprintRFNode[]; edges: BlueprintRFEdge[]; schema: SystemSchema }>;
  hasPendingChanges: boolean;
  /** When true, canvas positions are written into schema/YAML on save. */
  layoutCustomized: boolean;
  /** Bumped on each initSchema so Canvas can run load layout + fitView. */
  layoutSessionId: number;
  /** Path currently being loaded by selectSystem (prevents URL-sync loops). */
  systemSelectInFlight: string | null;

  recordHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  checkPendingChanges: () => Promise<void>;
  initSchema: (schema: SystemSchema) => void;
  /** Blank canvas with no sandbox systems - used before Mermaid import from startup. */
  resetToEmptyWorkspace: () => void;
  updateSchemaName: (name: string) => void;
  updateSchemaLevel: (level: C4Level) => void;
  importYaml: (yamlContent: string) => boolean;
  importJson: (jsonContent: string) => boolean;
  previewMermaidImport: (mermaid: string) => Promise<MermaidImportPreview>;
  importMermaid: (mermaid: string, resolutions: ConflictResolutions) => Promise<boolean>;
  previewIacImport: (files: IacSourceFile[], kind?: IacSourceKind) => Promise<IacImportPreview>;
  importIac: (
    files: IacSourceFile[],
    resolutions: ConflictResolutions,
    kind?: IacSourceKind
  ) => Promise<boolean>;
  clearError: () => void;
  onNodesChange: (changes: CanvasNodeChange[]) => void;
  onEdgesChange: (changes: CanvasEdgeChange[]) => void;
  onConnect: (connection: CanvasConnection) => void;
  addNode: (type: NodeType, position?: { x: number; y: number }) => void;
  updateNode: (id: string, updates: Partial<SystemNode>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null, options?: SelectionOptions) => void;
  selectEdge: (id: string | null, options?: SelectionOptions) => void;
  updateDependency: (from: string, to: string, updates: Partial<SystemDependency>) => void;
  deleteDependency: (from: string, to: string) => void;
  selectSystem: (path: string) => Promise<void>;
  listWorkspaceExternalCandidates: (filters?: ExternalCandidateFilters) => WorkspaceEntity[];
  addExternalDependencies: (entityRefs: string[], dependencies?: SystemDependency[]) => void;
  materializeCouplingGhost: (ghost: {
    entityRef?: string;
    filepath: string;
    position: { x: number; y: number };
  }) => void;
  syncSuggestedExternals: () => void;
  expandExternalSummaryHub: (band: import('@archlens/core').ExternalSummaryBand) => void;
  /**
   * Apply the selected layout engine and sync positions into schema / YAML.
   * Pass `persistToSchema: true` when the user explicitly requested layout.
   */
  applyClientLayout: (options?: {
    signal?: AbortSignal;
    persistToSchema?: boolean;
    recordHistory?: boolean;
    engine?: import('../../../../core').LayoutEngineId;
  }) => Promise<void>;
  markLayoutCustomized: () => void;
  applyRefactorBoundaryAsDraft: (boundary: RefactorBoundary) => boolean;
  /** Apply a schema from the collab session without pushing it back to the room. */
  applyRemoteCollabSchema: (schema: SystemSchema) => void;
}

export type DiagramStateDeps = DiagramState & UiState & IoState;
