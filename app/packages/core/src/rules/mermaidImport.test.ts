import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { systemSchemaPublicUrl } from '../models/schemaVersion';
import { computeImportMergePlan } from './schemaMerge';
import { parseMermaidToSchema, extractMermaidFromMarkdown } from './mermaidImport';

const FLOWCHART_GATEWAY_DB = `graph TD
    Gateway["Gateway Node"]
    DB[("DB Node")]
    Gateway --> DB`;

const FLOWCHART_LABELED_EDGE = `graph TD
    A["Service A"] --> |"Query"| B[("Database")]`;

const FLOWCHART_PUBSUB = `graph TD
    Pub["Publisher"] -.-> Sub["Subscriber"]`;

const FLOWCHART_DIAMOND = `graph TD
    Q{"Event Queue"}`;

const FLOWCHART_SUBGRAPH = `graph TD
    subgraph Driving [Driving UI]
      Canvas[Canvas.tsx]
    end
    Canvas --> Store[Store]`;

const FLOWCHART_COMPONENT = `flowchart LR
    Widget["Widget"]`;

const FLOWCHART_LABEL_DECORATIONS = `graph TD
    User["👤 Alice"]
    Ext["Payment API (External)"]`;

const C4_CONTEXT = `C4Context
    title System Context
    Person(user, "Banking Customer")
    System(banking, "Internet Banking System")
    Rel(user, banking, "Uses")`;

const C4_CONTAINER = `C4Container
    Person(customer, "Customer")
    System_Ext(payment, "Payment Gateway")
    Container(web, "Web App", "React")
    ContainerDb(db, "Database", "PostgreSQL")
    Rel(customer, web, "Uses")
    Rel(web, db, "Reads/Writes")
    Rel(web, payment, "Pays via")`;

const C4_COMPONENT = `C4Component
    Container(api, "API")
    Component(controller, "Controller", "REST")
    Rel(api, controller, "Delegates")`;

const UNSUPPORTED_SEQUENCE = 'sequenceDiagram\n  A->>B: hello';

const baseWorkspace: SystemSchema = {
  name: 'Existing',
  version: '1.0.0',
  level: 'container',
  entityRef: 'billing',
  nodes: [
    {
      entityRef: 'billing/gateway',
      type: 'rest-api',
      name: 'Gateway',
      position: { x: 10, y: 20 },
    },
    {
      entityRef: 'billing/auth',
      type: 'grpc-service',
      name: 'Auth Service',
      position: { x: 100, y: 200 },
    },
  ],
  dependencies: [{ from: 'billing/gateway', to: 'billing/auth', type: 'direct-call' }],
};

describe('parseMermaidToSchema - flowchart', () => {
  it('parses a simple graph TD with nodes and edges', () => {
    const result = parseMermaidToSchema(FLOWCHART_GATEWAY_DB, { targetLevel: 'container' });

    expect(result.format).toBe('flowchart');
    expect(result.schema.version).toBe(systemSchemaPublicUrl());
    expect(result.schema.level).toBe('container');
    expect(result.schema.nodes).toHaveLength(2);
    expect(result.schema.nodes.find(n => n.entityRef === 'gateway')).toMatchObject({
      name: 'Gateway Node',
      type: 'microservice',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'db')).toMatchObject({
      name: 'DB Node',
      type: 'relational-database',
    });
    expect(result.schema.dependencies).toHaveLength(1);
    expect(result.schema.dependencies[0]).toMatchObject({
      from: 'gateway',
      to: 'db',
      type: 'direct-call',
    });
  });

  it('parses labeled edges with descriptions', () => {
    const result = parseMermaidToSchema(FLOWCHART_LABELED_EDGE, { targetLevel: 'container' });

    expect(result.schema.dependencies[0]).toMatchObject({
      from: 'a',
      to: 'b',
      type: 'direct-call',
      description: 'Query',
    });
  });

  it('parses publish-subscribe edges from dotted arrows', () => {
    const result = parseMermaidToSchema(FLOWCHART_PUBSUB, { targetLevel: 'container' });

    expect(result.schema.dependencies[0].type).toBe('publish-subscribe');
  });

  it('infers event-broker from diamond shape', () => {
    const result = parseMermaidToSchema(FLOWCHART_DIAMOND, { targetLevel: 'container' });

    expect(result.schema.nodes[0]).toMatchObject({
      entityRef: 'q',
      name: 'Event Queue',
      type: 'event-broker',
    });
  });

  it('parses subgraph blocks into group nodes with parentEntityRef', () => {
    const result = parseMermaidToSchema(FLOWCHART_SUBGRAPH, { targetLevel: 'container' });

    expect(result.warnings.some(w => w.toLowerCase().includes('flattened'))).toBe(false);
    expect(result.schema.nodes.find(n => n.entityRef === 'driving')).toMatchObject({
      type: 'group',
      name: 'Driving UI',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'canvas')).toMatchObject({
      name: 'Canvas.tsx',
      parentEntityRef: 'driving',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'store')).toMatchObject({
      name: 'Store',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'store')?.parentEntityRef).toBeUndefined();
  });

  it('defaults component type at component level', () => {
    const result = parseMermaidToSchema(FLOWCHART_COMPONENT, { targetLevel: 'component' });

    expect(result.schema.nodes[0].type).toBe('component');
  });

  it('strips person emoji and (External) suffix from flowchart labels', () => {
    const result = parseMermaidToSchema(FLOWCHART_LABEL_DECORATIONS, { targetLevel: 'context' });

    expect(result.schema.nodes.find(n => n.entityRef === 'user')).toMatchObject({
      name: 'Alice',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'ext')).toMatchObject({
      name: 'Payment API',
      external: true,
    });
  });

  it('throws on unrecognised diagram type', () => {
    expect(() => parseMermaidToSchema(UNSUPPORTED_SEQUENCE, { targetLevel: 'container' })).toThrow(
      /unrecognised|unsupported/i
    );
  });

  it('throws when mermaid input is empty', () => {
    expect(() => parseMermaidToSchema('   \n  ', { targetLevel: 'container' })).toThrow(
      /mermaid input is empty/i
    );
  });
});

describe('parseMermaidToSchema - C4', () => {
  it('parses C4Context with Person, System and Rel', () => {
    const result = parseMermaidToSchema(C4_CONTEXT, { targetLevel: 'context' });

    expect(result.format).toBe('c4-context');
    expect(result.schema.version).toBe(systemSchemaPublicUrl());
    expect(result.schema.level).toBe('context');
    expect(result.schema.nodes).toHaveLength(2);
    expect(result.schema.nodes.find(n => n.entityRef === 'user')).toMatchObject({
      type: 'person',
      name: 'Banking Customer',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'banking')).toMatchObject({
      type: 'software-system',
      name: 'Internet Banking System',
    });
    expect(result.schema.dependencies[0]).toMatchObject({
      from: 'user',
      to: 'banking',
      description: 'Uses',
    });
  });

  it('parses C4Container with ContainerDb and external systems', () => {
    const result = parseMermaidToSchema(C4_CONTAINER, { targetLevel: 'container' });

    expect(result.format).toBe('c4-container');
    expect(result.schema.nodes.find(n => n.entityRef === 'db')).toMatchObject({
      type: 'relational-database',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'payment')).toMatchObject({
      external: true,
    });
    expect(result.schema.dependencies.length).toBeGreaterThanOrEqual(3);
  });

  it('parses C4Component diagram', () => {
    const result = parseMermaidToSchema(C4_COMPONENT, { targetLevel: 'component' });

    expect(result.format).toBe('c4-component');
    expect(result.schema.level).toBe('component');
    expect(result.schema.nodes.find(n => n.entityRef === 'controller')).toMatchObject({
      type: 'component',
    });
  });

  it('parses directed Rel variants and ignores malformed Rel lines', () => {
    const spaces = ' '.repeat(5000);
    const mermaid = `C4Context
    Person(user, "User")
    System(api, "API")
    Rel_U(user, api, "Calls")
    Rel(${spaces}
    Rel((,${spaces}`;

    const result = parseMermaidToSchema(mermaid, { targetLevel: 'context' });

    expect(result.schema.dependencies).toEqual([
      expect.objectContaining({ from: 'user', to: 'api', description: 'Calls' }),
    ]);
  });
});

describe('parseMermaidToSchema + computeImportMergePlan', () => {
  it('treats new flowchart nodes as additions in the conflict preview', () => {
    const { schema } = parseMermaidToSchema(FLOWCHART_GATEWAY_DB, {
      targetLevel: 'container',
      parentEntityRef: 'billing',
    });
    const plan = computeImportMergePlan(baseWorkspace, schema);

    expect(schema.nodes.map(n => n.entityRef).sort()).toEqual(['billing/db', 'billing/gateway']);
    expect(plan.additions.nodes.map(n => n.entityRef)).toEqual(['billing/db']);
    expect(plan.conflicts).toEqual([
      expect.objectContaining({
        entityRef: 'billing/gateway',
        existing: expect.objectContaining({ type: 'rest-api', name: 'Gateway' }),
        imported: expect.objectContaining({ type: 'microservice', name: 'Gateway Node' }),
      }),
    ]);
    expect(plan.additions.dependencies).toHaveLength(0);
    expect(plan.skippedEdges).toEqual([
      expect.objectContaining({
        from: 'billing/gateway',
        to: 'billing/db',
        type: 'direct-call',
      }),
    ]);
  });

  it('treats identical scoped flowchart nodes as unchanged', () => {
    const mermaid = `graph TD
    Gateway["Gateway"]`;
    const { schema } = parseMermaidToSchema(mermaid, {
      targetLevel: 'container',
      parentEntityRef: 'billing',
      defaultNodeType: 'rest-api',
    });
    const plan = computeImportMergePlan(baseWorkspace, schema);

    expect(plan.conflicts).toHaveLength(0);
    expect(plan.additions.nodes).toHaveLength(0);
    expect(plan.unchanged.nodes.some(n => n.entityRef === 'billing/gateway')).toBe(true);
  });

  it('previews C4 additions without inventing parse rules in the merge plan', () => {
    const { schema } = parseMermaidToSchema(C4_CONTEXT, {
      targetLevel: 'context',
      parentEntityRef: 'billing',
    });
    const plan = computeImportMergePlan(baseWorkspace, schema);

    expect(plan.additions.nodes.map(n => n.entityRef).sort()).toEqual([
      'billing/banking',
      'billing/user',
    ]);
    expect(plan.conflicts).toHaveLength(0);
    expect(plan.additions.dependencies).toEqual([
      expect.objectContaining({
        from: 'billing/user',
        to: 'billing/banking',
        description: 'Uses',
      }),
    ]);
  });
});

describe('extractMermaidFromMarkdown', () => {
  it('extracts the first mermaid fenced block', () => {
    const md = `# Title

Some text.

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

More text.`;

    expect(extractMermaidFromMarkdown(md)).toContain('graph TD');
    expect(extractMermaidFromMarkdown(md)).toContain('A --> B');
  });

  it('is case-insensitive on the fence language tag', () => {
    const md = '```Mermaid\ngraph TD\n  A --> B\n```';
    expect(extractMermaidFromMarkdown(md)).toContain('graph TD');
  });

  it('returns trimmed input when no fence is found', () => {
    expect(extractMermaidFromMarkdown('graph TD\n  A --> B')).toContain('graph TD');
  });

  it('returns trimmed input when fence opener has non-whitespace junk', () => {
    const md = '```mermaidx\ngraph TD\n  A --> B\n```';
    expect(extractMermaidFromMarkdown(md)).toBe(md.trim());
  });

  it('skips an invalid mermaid-prefixed fence and uses a later valid one', () => {
    const md = `\`\`\`mermaidx
ignored
\`\`\`

\`\`\`mermaid
graph TD
  A --> B
\`\`\``;
    expect(extractMermaidFromMarkdown(md)).toContain('graph TD');
  });
});
