import type { SystemSchema } from '@archlens/core';
import type { DiagramCrumb, DiagramView } from '../features/editorPreview/ports';

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
  readonly workspaceRoot?: string;
}

const sessions = new Map<number, OpenDiagram>();
let generation = 0;
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
  sessions.set(id, {
    ...sessionFrom(id, diagram, workspaceRoot, schema ?? existing.schema),
    breadcrumb: diagram.breadcrumb ?? existing.breadcrumb,
    hotspotsOn: existing.hotspotsOn,
  });
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
    ...(session.workspaceRoot ? { workspaceRoot: session.workspaceRoot } : {}),
    diagram: {
      sourcePath: session.sourcePath,
      level: session.level,
      systems: session.systems,
      links: session.links,
      breadcrumb: session.breadcrumb,
    },
  };
}

export function setSessionSchema(id: number, schema: SystemSchema): void {
  const session = sessions.get(id);
  if (!session) return;
  session.schema = schema;
}

export function setSessionHotspots(id: number, on: boolean): void {
  const session = sessions.get(id);
  if (!session) return;
  session.hotspotsOn = on;
}

export function closeDiagramSession(id: number): void {
  const wasVisible = visibleId === id;
  sessions.delete(id);
  if (wasVisible) visibleId = [...sessions.keys()].at(-1);
}

export function resetDiagramSession(): void {
  generation = 0;
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
