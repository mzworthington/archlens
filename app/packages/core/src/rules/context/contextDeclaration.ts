import type {
  DependencyType,
  NodeType,
  SystemDependency,
  SystemNode,
  SystemSchema,
} from '../../models/schema';
import { EntityRef } from '../../models/schema';
import {
  DISPLAY_NAME_SOURCE_PROPERTY,
  displayNameSourceForDeclaration,
  resolveDisplayName,
} from '../../lib/displayName';
import { systemSchemaPublicUrl } from '../../models/schemaVersion';
import { THIRD_PARTY_CLASSIFICATION } from '../../taxonomy/nodeOwnership';
import { CONTEXT_OWNERSHIP_AUTHOR, CONTEXT_OWNERSHIP_PROPERTY } from './contextHydration';
import { serializeSchemaToYaml } from '../graph';

export type DeclaredPersona = {
  /** Leaf id under the landscape (e.g. `architect`). */
  id: string;
  /** Optional; derived from `id` when omitted. */
  name?: string;
  description?: string;
  /** Optional product tag on the persona. */
  product?: string;
};

export type DeclaredSystemAnchor = {
  /** Fully qualified or landscape-relative entityRef. */
  entityRef: string;
  /** Optional; derived from entityRef when omitted. */
  name?: string;
  type?: 'software-system' | 'group';
};

export type DeclaredExternal = {
  id: string;
  /** Optional; derived from `id` when omitted. */
  name?: string;
  type?: NodeType;
  vendor?: string;
  description?: string;
};

export type DeclaredDependency = {
  from: string;
  to: string;
  type?: DependencyType;
  description?: string;
};

/** JSON-friendly declared system context (assembled into BlueprintSpec YAML). */
export type ContextDeclaration = {
  entityRef: string;
  /** Optional landscape label; derived from entityRef when omitted. */
  name?: string;
  description?: string;
  personas?: DeclaredPersona[];
  systems?: DeclaredSystemAnchor[];
  externals?: DeclaredExternal[];
  /** When omitted, persona→first system and system→each external edges are synthesized. */
  dependencies?: DeclaredDependency[];
};

function resolveRef(value: string, landscapeEntityRef: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('entityRef is required');
  if (trimmed.includes('/')) {
    // Do not slugify `/` away - parse each segment.
    return trimmed
      .split('/')
      .map(part => EntityRef.parse(part))
      .filter(Boolean)
      .join('/');
  }
  const leaf = EntityRef.parse(trimmed);
  // Bare landscape slug stays at context level (system/group on the landscape).
  if (leaf === landscapeEntityRef) return landscapeEntityRef;
  return EntityRef.parse(trimmed, landscapeEntityRef);
}

function authorNode(node: SystemNode, nameSource: string): SystemNode {
  return {
    ...node,
    properties: {
      ...node.properties,
      [CONTEXT_OWNERSHIP_PROPERTY]: CONTEXT_OWNERSHIP_AUTHOR,
      [DISPLAY_NAME_SOURCE_PROPERTY]: nameSource,
    },
  };
}

/**
 * Assemble a sparse `level: context` SystemSchema from a JSON declaration.
 * Output is suitable as a scan hydration seed.
 */
export function assembleContextDeclaration(declaration: ContextDeclaration): SystemSchema {
  const landscapeEntityRef = EntityRef.parse(declaration.entityRef);
  const landscapeName = resolveDisplayName(declaration.name, landscapeEntityRef);

  const nodes: SystemNode[] = [];
  const personaRefs: string[] = [];
  const systemRefs: string[] = [];
  const externalRefs: string[] = [];

  for (const system of declaration.systems ?? []) {
    const entityRef = resolveRef(system.entityRef, landscapeEntityRef);
    systemRefs.push(entityRef);
    nodes.push(
      authorNode(
        {
          entityRef,
          type: system.type ?? 'software-system',
          name: resolveDisplayName(system.name, entityRef),
        },
        displayNameSourceForDeclaration(system.name)
      )
    );
  }

  for (const persona of declaration.personas ?? []) {
    const entityRef = EntityRef.parse(persona.id, landscapeEntityRef);
    personaRefs.push(entityRef);
    nodes.push(
      authorNode(
        {
          entityRef,
          type: 'person',
          name: resolveDisplayName(persona.name, entityRef),
          properties: {
            role: 'product-persona',
            ...(persona.product ? { product: persona.product } : {}),
          },
        },
        displayNameSourceForDeclaration(persona.name)
      )
    );
  }

  for (const external of declaration.externals ?? []) {
    const entityRef = EntityRef.parse(external.id, landscapeEntityRef);
    externalRefs.push(entityRef);
    nodes.push(
      authorNode(
        {
          entityRef,
          type: external.type ?? 'software-system',
          name: resolveDisplayName(external.name, entityRef),
          external: true,
          properties: {
            classification: THIRD_PARTY_CLASSIFICATION,
            ...(external.vendor ? { vendor: external.vendor } : {}),
          },
        },
        displayNameSourceForDeclaration(external.name)
      )
    );
  }

  let dependencies: SystemDependency[];
  if (declaration.dependencies?.length) {
    dependencies = declaration.dependencies.map(dep => ({
      from: resolveRef(dep.from, landscapeEntityRef),
      to: resolveRef(dep.to, landscapeEntityRef),
      type: dep.type ?? 'direct-call',
      ...(dep.description ? { description: dep.description } : {}),
    }));
  } else {
    dependencies = [];
    const primarySystem = systemRefs[0];
    if (primarySystem) {
      for (const personaRef of personaRefs) {
        const persona = (declaration.personas ?? []).find(
          p => EntityRef.parse(p.id, landscapeEntityRef) === personaRef
        );
        dependencies.push({
          from: personaRef,
          to: primarySystem,
          type: 'direct-call',
          ...(persona?.description ? { description: persona.description } : {}),
        });
      }
      for (let i = 0; i < externalRefs.length; i++) {
        const externalRef = externalRefs[i]!;
        const external = declaration.externals?.[i];
        dependencies.push({
          from: primarySystem,
          to: externalRef,
          type: 'direct-call',
          ...(external?.description ? { description: external.description } : {}),
        });
      }
    }
  }

  return {
    entityRef: landscapeEntityRef,
    name: landscapeName,
    version: systemSchemaPublicUrl(),
    level: 'context',
    nodes,
    dependencies,
  };
}

/** Serialize a context declaration to BlueprintSpec YAML (scan hydration seed). */
export function serializeContextDeclarationToYaml(declaration: ContextDeclaration): string {
  const schema = assembleContextDeclaration(declaration);
  const description = declaration.description?.trim();
  return serializeSchemaToYaml(schema, description ? { description } : undefined);
}
