import type { DiagramView } from '../features/editorPreview/ports';

export interface FocusedDiagramSystem {
  readonly name: string;
  readonly sourceFile?: string;
  readonly workspaceRoot?: string;
}

interface OpenDiagram {
  readonly id: number;
  readonly systems: DiagramView['systems'];
  readonly workspaceRoot?: string;
}

let generation = 0;
let current: OpenDiagram | undefined;
let focusedEntityRef: string | undefined;

export function openDiagramSession(
  diagram: DiagramView,
  workspaceRoot: string | undefined
): number {
  generation += 1;
  current = { id: generation, systems: diagram.systems, workspaceRoot };
  focusedEntityRef = undefined;
  return generation;
}

export function closeDiagramSession(id: number): void {
  if (current?.id !== id) return;
  current = undefined;
  focusedEntityRef = undefined;
}

export function focusDiagramSystem(entityRef: string): void {
  if (!current?.systems.some(system => system.entityRef === entityRef)) return;
  focusedEntityRef = entityRef;
}

export function readFocusedSystem(): FocusedDiagramSystem | undefined {
  if (!current || !focusedEntityRef) return undefined;
  const system = current.systems.find(item => item.entityRef === focusedEntityRef);
  if (!system) return undefined;
  return {
    name: system.name,
    ...(system.sourceFile ? { sourceFile: system.sourceFile } : {}),
    ...(current.workspaceRoot ? { workspaceRoot: current.workspaceRoot } : {}),
  };
}

export function resetDiagramSession(): void {
  generation = 0;
  current = undefined;
  focusedEntityRef = undefined;
}
