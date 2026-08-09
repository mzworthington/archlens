import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import Parser from 'web-tree-sitter';
import { wasmFileName } from '@archlens/core';
import { resolveTreeSitterWasmSourceDirs } from '@archlens/core/tree-sitter-wasm';
import { extractParsedSourceFileFromTree } from './treeSitterAstExtract.ts';

const { runtimeDir, wasmsOutDir } = resolveTreeSitterWasmSourceDirs(import.meta.url);
const languages = new Map<string, Parser.Language>();

async function parse(relativePath: string, source: string, langKey: string) {
  let language = languages.get(langKey);
  if (!language) {
    language = await Parser.Language.load(path.join(wasmsOutDir, wasmFileName(langKey)));
    languages.set(langKey, language);
  }
  const parser = new Parser();
  parser.setLanguage(language);
  return extractParsedSourceFileFromTree({
    filePath: `/repo/${relativePath}`,
    relativePath,
    tree: parser.parse(source),
  });
}

describe('extractParsedSourceFileFromTree', () => {
  beforeAll(async () => {
    await Parser.init({
      locateFile: (scriptName: string) => path.join(runtimeDir, scriptName),
    });
  });

  it('extracts TypeScript imports, re-exports, constructors, and calls', async () => {
    const parsed = await parse(
      'src/domain/orderService.ts',
      `import { Repo } from './repo';
import type { Order } from '../types';
export { helper } from './helper';

export class OrderService {
  private repo = new Repo();
  run() {
    return this.repo.load();
  }
}
`,
      'typescript'
    );

    expect(parsed.imports.map(i => i.moduleSpecifier)).toEqual(['./repo', '../types']);
    expect(parsed.reExports.map(r => r.moduleSpecifier)).toEqual(['./helper']);
    expect(parsed.newExpressions.map(n => n.className)).toContain('Repo');
    expect(parsed.callExpressions).toContain('this.repo.load');
    expect(parsed.baseName).toBe('orderService');
    expect(parsed.isTestFile).toBe(false);
  });

  it('flags test files from their path', async () => {
    const parsed = await parse(
      'src/domain/orderService.test.ts',
      `import { OrderService } from './orderService';\n`,
      'typescript'
    );

    expect(parsed.isTestFile).toBe(true);
  });

  it('extracts Python imports and capitalised constructor-like calls', async () => {
    const parsed = await parse(
      'app/service.py',
      `import os.path
from app.repo import Repo

def build():
    return Repo()
`,
      'python'
    );

    expect(parsed.imports.map(i => i.moduleSpecifier)).toContain('os.path');
    expect(parsed.imports.map(i => i.moduleSpecifier)).toContain('app.repo');
    expect(parsed.newExpressions.map(n => n.className)).toContain('Repo');
  });

  it('extracts Go package clause, imports, and exported constructors', async () => {
    const parsed = await parse(
      'internal/server/server.go',
      `package server

import (
	"net/http"
)

func New() *http.ServeMux {
	return http.NewServeMux()
}
`,
      'go'
    );

    expect(parsed.namespaces).toContain('server');
    expect(parsed.imports.map(i => i.moduleSpecifier)).toContain('net/http');
    expect(parsed.newExpressions.map(n => n.className)).toContain('http.NewServeMux');
  });

  it('extracts Java package, imports, and object creation', async () => {
    const parsed = await parse(
      'src/main/java/com/acme/OrderService.java',
      `package com.acme.orders;

import com.acme.repo.OrderRepository;

public class OrderService {
  private final OrderRepository repo = new OrderRepository();
}
`,
      'java'
    );

    expect(parsed.namespaces).toContain('com.acme.orders');
    expect(parsed.imports.map(i => i.moduleSpecifier)).toContain('com.acme.repo.OrderRepository');
    expect(parsed.newExpressions.map(n => n.className)).toContain('OrderRepository');
  });

  it('extracts C# namespace, usings, and base types', async () => {
    const parsed = await parse(
      'src/Orders/OrderService.cs',
      `using Acme.Repositories;

namespace Acme.Orders
{
    public class OrderService : ServiceBase
    {
        private readonly OrderRepository _repo = new OrderRepository();
    }
}
`,
      'c_sharp'
    );

    expect(parsed.namespaces).toContain('Acme.Orders');
    expect(parsed.imports.map(i => i.moduleSpecifier)).toContain('Acme.Repositories');
    expect(parsed.newExpressions.map(n => n.className)).toContain('OrderRepository');
    expect(parsed.newExpressions.map(n => n.className)).toContain('ServiceBase');
  });
});
