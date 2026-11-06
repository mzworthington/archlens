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
  focusedEntityRef?: string;
  focusedAt?: number;
}

const sessions = new Map<number, OpenDiagram>();
let generation = 0;
let focusClock = 0;
let activeId: number | undefined;

export function openDiagramSession(
  diagram: DiagramView,
  workspaceRoot: string | undefined
): number {
  generation += 1;
  sessions.set(generation, { id: generation, systems: diagram.systems, workspaceRoot });
  return generation;
}

export function replaceDiagramSession(
  id: number,
  diagram: DiagramView,
  workspaceRoot: string | undefined
): number {
  if (!sessions.has(id)) return openDiagramSession(diagram, workspaceRoot);
  const wasActive = activeId === id;
  sessions.set(id, { id, systems: diagram.systems, workspaceRoot });
  if (wasActive) activeId = undefined;
  return id;
}

export function closeDiagramSession(id: number): void {
  const wasActive = activeId === id;
  sessions.delete(id);
  if (!wasActive) return;
  activeId = latestFocusedSession();
}

export function focusDiagramSystem(sessionId: number, entityRef: string): void {
  const session = sessions.get(sessionId);
  if (!session?.systems.some(system => system.entityRef === entityRef)) return;
  focusClock += 1;
  session.focusedEntityRef = entityRef;
  session.focusedAt = focusClock;
  activeId = sessionId;
}

export function readFocusedSystem(): FocusedDiagramSystem | undefined {
  if (activeId === undefined) return undefined;
  const session = sessions.get(activeId);
  if (!session?.focusedEntityRef) return undefined;
  const system = session.systems.find(item => item.entityRef === session.focusedEntityRef);
  if (!system) return undefined;
  return {
    name: system.name,
    ...(system.sourceFile ? { sourceFile: system.sourceFile } : {}),
    ...(session.workspaceRoot ? { workspaceRoot: session.workspaceRoot } : {}),
  };
}

export function resetDiagramSession(): void {
  generation = 0;
  focusClock = 0;
  activeId = undefined;
  sessions.clear();
}

function latestFocusedSession(): number | undefined {
  let bestId: number | undefined;
  let bestAt = 0;
  for (const session of sessions.values()) {
    if (session.focusedEntityRef === undefined || session.focusedAt === undefined) continue;
    if (bestId === undefined || session.focusedAt > bestAt) {
      bestId = session.id;
      bestAt = session.focusedAt;
    }
  }
  return bestId;
}
