import { describe, it, expect } from 'vitest';
import { extractPythonImports } from './extractPythonImports';

describe('extractPythonImports', () => {
  it('extracts absolute and relative module specifiers from import lines', () => {
    const source = `
from mimetypes import guess_type
from pathlib import Path
from fastapi import FastAPI
from romini.features.library.add_track import add_track
from .shared import DashboardCtx
from ..play_by_tag.place_figure import on_figure_placed
import os
import romini.composition.dashboard.shared as dashboard_shared
`;
    expect(extractPythonImports(source)).toEqual([
      'mimetypes',
      'pathlib',
      'fastapi',
      'romini.features.library.add_track',
      '.shared',
      '..play_by_tag.place_figure',
      'os',
      'romini.composition.dashboard.shared',
    ]);
  });
});
