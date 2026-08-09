import { describe, expect, it } from 'vitest';
import {
  isLiteScanIacPath,
  isLiteScanJsTsPath,
  isLiteScanMetadataPath,
  isLiteScanPulumiProjectPath,
  isLiteScanSourcePath,
} from './liteScanLimits';

describe('liteScanLimits', () => {
  it('accepts CLI-supported source extensions and skips declarations', () => {
    expect(isLiteScanSourcePath('src/a.ts')).toBe(true);
    expect(isLiteScanSourcePath('src/a.py')).toBe(true);
    expect(isLiteScanSourcePath('pkg/store.go')).toBe(true);
    expect(isLiteScanSourcePath('OrderService.java')).toBe(true);
    expect(isLiteScanSourcePath('OrderService.cs')).toBe(true);
    expect(isLiteScanSourcePath('index.d.ts')).toBe(false);
    expect(isLiteScanSourcePath('main.tf')).toBe(false);
  });

  it('limits lightweight import extraction to JS/TS', () => {
    expect(isLiteScanJsTsPath('src/a.ts')).toBe(true);
    expect(isLiteScanJsTsPath('loader.mjs')).toBe(true);
    expect(isLiteScanJsTsPath('src/a.py')).toBe(false);
    expect(isLiteScanJsTsPath('pkg/store.go')).toBe(false);
  });

  it('treats package manifests and csproj as metadata', () => {
    expect(isLiteScanMetadataPath('package.json')).toBe(true);
    expect(isLiteScanMetadataPath('pnpm-workspace.yaml')).toBe(true);
    expect(isLiteScanMetadataPath('src/Acme.API.csproj')).toBe(true);
    expect(isLiteScanMetadataPath('README.md')).toBe(false);
  });

  it('recognizes Terraform and Pulumi as IaC inputs, not application sources', () => {
    expect(isLiteScanIacPath('infra/main.tf')).toBe(true);
    expect(isLiteScanIacPath('infra/main.tf.json')).toBe(true);
    expect(isLiteScanIacPath('infra/Pulumi.yaml')).toBe(true);
    expect(isLiteScanPulumiProjectPath('infra/Pulumi.yaml')).toBe(true);
    expect(isLiteScanPulumiProjectPath('infra/main.tf')).toBe(false);
    expect(isLiteScanSourcePath('infra/main.tf')).toBe(false);
  });
});
