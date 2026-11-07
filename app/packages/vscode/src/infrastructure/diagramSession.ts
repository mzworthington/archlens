import type { SystemSchema } from '@archlens/core';
import type { DiagramCrumb, DiagramView } from '../features/editorPreview/ports';

export interface FocusedDiagramSystem {
  readonly name: string;
  readonly sourceFile?: string;
  readonly workspaceRoot?: string;
}

interface OpenDiagram {
  readonly id: number;
  readonly systems: DiagramView['systems'];
  readonly links: DiagramView['links'];
  readonly workspaceRoot?: string;
  readonly sourcePath: string;
  readonly level: DiagramView['level'];
  readonly breadcrumb: readonly DiagramCrumb[];
  schema?: SystemSchema;
  hotspotsOn: boolean;
  focusedEntityRef?: string;
  focusedAt?: number;
}

export interface VisibleDiagram {
  readonly id: number;
  readonly schema?: SystemSchema;
  readonly breadcrumb: readonly DiagramCrumb[];
  readonly sourcePath: string;
  readonly workspaceRoot?: string;
  readonly systems: DiagramView['systems'];
  readonly hotspotsOn: boolean;
}

export interface SessionView {
  readonly diagram: DiagramView;
  readonly schema?: SystemSchema;
  readonly hotspotsOn: boolean;
}

const sessions = new Map<number, OpenDiagram>();
let generation = 0;
let focusClock = 0;
let activeId: number | undefined;
let visibleId: number | undefined;

export function openDiagramSession(
  diagram: DiagramView,
  workspaceRoot: string | undefined,
  schema?: SystemSchema
): number {
  generation += 1;
  sessions.set(generation, sessionFrom(generation, diagram, workspaceRoot, schema));
  visibleId = generation;
  return generation;
}

export function replaceDiagramSession(
  id: number,
  diagram: DiagramView,
  workspaceRoot: string | undefined,
  schema?: SystemSchema
): number {
  const existing = sessions.get(id);
  if (!existing) return openDiagramSession(diagram, workspaceRoot, schema);
  const wasActive = activeId === id;
  sessions.set(id, {
    ...sessionFrom(id, diagram, workspaceRoot, schema ?? existing.schema),
    breadcrumb: diagram.breadcrumb ?? existing.breadcrumb,
    hotspotsOn: existing.hotspotsOn,
  });
  if (wasActive) activeId = undefined;
  return id;
}

export function showInSession(
  id: number,
  diagram: DiagramView,
  schema: SystemSchema,
  breadcrumb: readonly DiagramCrumb[]
): void {
  const existing = sessions.get(id);
  if (!existing) return;
  sessions.set(id, {
    ...sessionFrom(id, diagram, existing.workspaceRoot, schema),
    breadcrumb,
    hotspotsOn: existing.hotspotsOn,
  });
  if (activeId === id) activeId = undefined;
  visibleId = id;
}

export function readVisibleDiagram(): VisibleDiagram | undefined {
  if (visibleId === undefined) return undefined;
  const session = sessions.get(visibleId);
  if (!session) return undefined;
  return {
    id: session.id,
    schema: session.schema,
    breadcrumb: session.breadcrumb,
    sourcePath: session.sourcePath,
    workspaceRoot: session.workspaceRoot,
    systems: session.systems,
    hotspotsOn: session.hotspotsOn,
  };
}

export function readSessionView(id: number): SessionView | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;
  return {
    hotspotsOn: session.hotspotsOn,
    schema: session.schema,
    diagram: {
      sourcePath: session.sourcePath,
      level: session.level,
      systems: session.systems,
      links: session.links,
      breadcrumb: session.breadcrumb,
    },
  };
}

export function setSessionHotspots(id: number, on: boolean): void {
  const session = sessions.get(id);
  if (!session) return;
  session.hotspotsOn = on;
}

export function closeDiagramSession(id: number): void {
  const wasActive = activeId === id;
  const wasVisible = visibleId === id;
  sessions.delete(id);
  if (wasVisible) visibleId = [...sessions.keys()].at(-1);
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
  visibleId = sessionId;
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
  visibleId = undefined;
  sessions.clear();
}

function sessionFrom(
  id: number,
  diagram: DiagramView,
  workspaceRoot: string | undefined,
  schema: SystemSchema | undefined
): OpenDiagram {
  return {
    id,
    systems: diagram.systems,
    workspaceRoot,
    sourcePath: diagram.sourcePath,
    level: diagram.level,
    links: diagram.links,
    hotspotsOn: false,
    breadcrumb: diagram.breadcrumb ?? [
      {
        name: schema?.name || diagram.systems[0]?.name || 'Diagram',
        sourcePath: diagram.sourcePath,
      },
    ],
    ...(schema ? { schema } : {}),
  };
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
