import { describe, it, expect } from 'vitest';
import { parseSchemaFromYaml } from './graphParse';
import { serializeSchemaToYaml } from './graphSerialize';
import { serializeSchemaToMermaid } from './graphMermaid';
import type { SystemSchema } from '../models/schema';

describe('Mermaid export', () => {
  it('should serialize SystemSchema model to valid Mermaid code and handle keyword conflicts', () => {
    const schema: SystemSchema = {
      name: 'Demo System',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'Gateway', type: 'rest-api', name: 'Gateway Node' },
        { entityRef: 'DB', type: 'relational-database', name: 'DB Node' },
        { entityRef: 'graph', type: 'background-worker', name: 'graph Service' },
      ],
      dependencies: [{ from: 'Gateway', to: 'DB', type: 'direct-call', description: 'Query' }],
    };

    const mermaidContent = serializeSchemaToMermaid(schema);
    expect(mermaidContent).toContain('graph TD');
    expect(mermaidContent).toContain('node_Gateway["Gateway Node"]');
    expect(mermaidContent).toContain('node_DB[("DB Node")]');
    expect(mermaidContent).toContain('node_graph["graph Service"]');
    expect(mermaidContent).toContain('node_Gateway --> |"Query"| node_DB');
  });

  it('serializes group children into subgraph blocks', () => {
    const schema: SystemSchema = {
      name: 'Demo Context',
      version: '1.0.0',
      level: 'context',
      nodes: [
        { entityRef: 'demo/user', type: 'person', name: 'User' },
        { entityRef: 'demo/hub', type: 'group', name: 'Product Hub' },
        {
          entityRef: 'demo/api',
          type: 'software-system',
          name: 'API',
          parentEntityRef: 'demo/hub',
        },
      ],
      dependencies: [
        { from: 'demo/user', to: 'demo/hub', type: 'direct-call', description: 'Uses' },
      ],
    };

    const mermaid = serializeSchemaToMermaid(schema);
    expect(mermaid).toContain('subgraph node_demo_hub["Product Hub"]');
    expect(mermaid).toContain('node_demo_api["API"]');
    expect(mermaid).toContain('node_demo_user --> |"Uses"| node_demo_hub');

    const imported = parseSchemaFromYaml(serializeSchemaToYaml(schema));
    const reExported = serializeSchemaToMermaid(imported);
    expect(reExported).toContain('subgraph node_demo_hub["Product Hub"]');
  });

  it('should serialize C4 properties to valid Mermaid', () => {
    const schema: SystemSchema = {
      name: 'Workspace Level',
      version: '1.2.0',
      level: 'container',
      entityRef: 'billing/web-portal',
      nodes: [
        {
          entityRef: 'billing/web-portal/webapp',
          type: 'web-app',
          name: 'Web Portal',
        },
        {
          entityRef: 'billing/web-portal/external_svc',
          type: 'software-system',
          name: 'API Service',
          external: true,
        },
      ],
      dependencies: [
        {
          from: 'billing/web-portal/webapp',
          to: 'billing/web-portal/external_svc',
          type: 'direct-call',
          description: 'Hits Endpoint',
        },
      ],
    };

    const mermaid = serializeSchemaToMermaid(schema);
    expect(mermaid).toContain('node_billing_web_portal_webapp["Web Portal"]');
    expect(mermaid).toContain('node_billing_web_portal_external_svc["API Service (External)"]');
  });
});
