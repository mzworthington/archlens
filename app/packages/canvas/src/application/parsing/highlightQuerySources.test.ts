import { describe, it, expect } from 'vitest';
import Parser from 'web-tree-sitter';
import {
  TREE_SITTER_WASMS_PACKAGE_LANGUAGES,
  TREE_SITTER_HCL_PACKAGE_LANGUAGES,
  wasmFileName,
} from '@archlens/core';
import { highlightQueryForLanguage } from './highlightQuerySources';

// Loads WASM from disk - requires Node (not jsdom).
// @vitest-environment node

const wasmDir = new URL('../../../public/tree-sitter/', import.meta.url);

function wasmFilePath(name: string): string {
  return new URL(name, wasmDir).pathname;
}

function nodeNamesInQuery(query: string): string[] {
  const names = new Set<string>();
  for (const match of query.matchAll(/\(([a-z_][a-z0-9_]*)\)/g)) {
    names.add(match[1]);
  }
  return [...names].sort();
}

describe('highlightQuerySources', () => {
  it('loads highlight queries for all shipped grammars', async () => {
    await Parser.init({
      locateFile(scriptName: string) {
        return wasmFilePath(scriptName);
      },
    });

    const languages = [
      ...TREE_SITTER_WASMS_PACKAGE_LANGUAGES,
      ...TREE_SITTER_HCL_PACKAGE_LANGUAGES,
    ];

    for (const lang of languages) {
      const language = await Parser.Language.load(wasmFilePath(wasmFileName(lang)));

      const querySource = highlightQueryForLanguage(lang);

      expect(() => language.query(querySource), `invalid ${lang} highlight query`).not.toThrow();

      for (const nodeName of nodeNamesInQuery(querySource)) {
        expect(
          () => language.query(`(${nodeName}) @capture`),
          `unknown node "${nodeName}" in ${lang} highlight query`
        ).not.toThrow();
      }
    }
  });
});
