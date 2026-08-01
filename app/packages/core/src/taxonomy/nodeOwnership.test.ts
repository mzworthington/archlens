import { describe, expect, it } from 'vitest';
import type { SystemNode } from '../models/schema';
import {
  externalNodeBadgeLabel,
  isHumanActorNode,
  isThirdPartyNode,
  isWorkspaceProxyNode,
  resolveExternalNodeKind,
} from './nodeOwnership';

describe('nodeOwnership', () => {
  it('treats C4 persons and product personas as human actors', () => {
    expect(isHumanActorNode({ type: 'person', name: 'Shopper' })).toBe(true);
    expect(
      isHumanActorNode({
        type: 'web-app',
        name: 'Web',
        properties: { role: 'product-persona' },
      })
    ).toBe(true);
    expect(isHumanActorNode({ type: 'microservice', name: 'API' })).toBe(false);
  });

  it('detects third-party classification', () => {
    const thirdParty: SystemNode = {
      entityRef: 'shop/gateway',
      type: 'gateway-api',
      name: 'Payment Gateway',
      external: true,
      properties: { classification: 'third-party' },
    };
    expect(isThirdPartyNode(thirdParty)).toBe(true);
    expect(isWorkspaceProxyNode(thirdParty)).toBe(false);
    expect(resolveExternalNodeKind(thirdParty)).toBe('third-party');
    expect(externalNodeBadgeLabel('third-party')).toBe('(Third-party)');
  });

  it('treats workspace proxies separately from vendors', () => {
    const proxy: SystemNode = {
      entityRef: 'shop/auth',
      type: 'microservice',
      name: 'Auth (External)',
      external: true,
    };
    expect(isThirdPartyNode(proxy)).toBe(false);
    expect(isWorkspaceProxyNode(proxy)).toBe(true);
    expect(resolveExternalNodeKind(proxy)).toBe('workspace-proxy');
    expect(externalNodeBadgeLabel('workspace-proxy')).toBe('(Workspace)');
  });
});
