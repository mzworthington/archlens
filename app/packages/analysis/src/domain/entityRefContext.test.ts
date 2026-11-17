import { describe, it, expect } from 'vitest';
import {
  resolveBlueprintOutputSegment,
  resolveContextDisplayName,
  resolveSystemEntityRef,
} from './entityRefContext';

describe('entityRefContext', () => {
  it('maps known context slugs to display titles', () => {
    expect(resolveContextDisplayName('backstage')).toBe('Backstage');
    expect(resolveContextDisplayName('blueprint')).toBe('ArchLens');
    expect(resolveContextDisplayName('infrastructure')).toBe('Infrastructure Examples');
  });

  it('nests under a stable system leaf when system id matches the context root', () => {
    expect(resolveSystemEntityRef('eshop', 'eshop')).toBe('eshop/system');
    expect(resolveSystemEntityRef('backstage', 'plugins')).toBe('backstage/plugins');
    expect(resolveSystemEntityRef('application', 'gpio-build-monitor')).toBe(
      'application/gpio-build-monitor'
    );
  });

  it('keeps blueprint disk paths aligned with system-first entityRefs', () => {
    expect(resolveBlueprintOutputSegment('archlens', 'cloudflare')).toBe('archlens/cloudflare');
    expect(resolveBlueprintOutputSegment('archlens', 'Cloudflare')).toBe('archlens/cloudflare');
    expect(resolveBlueprintOutputSegment('gpio-build-monitor', 'cloudflare')).toBe(
      'gpio-build-monitor/cloudflare'
    );
    expect(resolveBlueprintOutputSegment('infrastructure', 'aws-lambda-api')).toBe(
      'infrastructure/aws-lambda-api'
    );
    expect(resolveBlueprintOutputSegment('gpio-build-monitor', 'gpio-build-monitor')).toBe(
      'gpio-build-monitor/system'
    );
  });
});
