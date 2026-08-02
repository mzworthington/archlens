import { readFileSync } from "node:fs";
import path from "node:path";

import { detectPeaks } from "../../domain/detectPeaks.js";
import { minePatterns } from "../../domain/minePatterns.js";
import { scoreHype } from "../../domain/scoreHype.js";
import type { SessionDebrief } from "../../domain/types.js";
import {
  parseHypeSessionManifest,
  SessionActionsSchema,
  SessionFeaturesSchema,
} from "../../schema/hypeSession.js";

export type AnalyzeSessionRequest = {
  sessionDir: string;
};

export class SessionPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionPathError";
  }
}

/**
 * Load a session pack from disk and produce a debrief (curve, peaks, patterns).
 */
export function analyzeSession(request: AnalyzeSessionRequest): SessionDebrief {
  const root = path.resolve(request.sessionDir);
  const manifestPath = resolveInsideSession(root, "session.json");
  const featuresPath = resolveInsideSession(root, "features.json");
  const actionsPath = resolveInsideSession(root, "actions.json");

  const manifest = parseHypeSessionManifest(readJson(manifestPath));
  const features = SessionFeaturesSchema.parse(readJson(featuresPath));
  const actionsRaw = readJsonOptional(actionsPath) ?? { actions: [] };
  const actions = SessionActionsSchema.parse(actionsRaw);

  const hypeCurve = scoreHype(features.frames);
  const peaks = detectPeaks(hypeCurve);
  const patterns = minePatterns(actions.actions, peaks);

  return {
    sessionId: manifest.sessionId,
    hypeCurve,
    peaks,
    patterns,
  };
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function readJsonOptional(filePath: string): unknown | undefined {
  try {
    return readJson(filePath);
  } catch (error) {
    if (isErrno(error) && error.code === "ENOENT") return undefined;
    throw error;
  }
}

/** Resolve a relative path that must stay inside the session root. */
export function resolveInsideSession(root: string, relativePath: string): string {
  if (path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) {
    throw new SessionPathError(`Refusing path outside session root: ${relativePath}`);
  }
  const resolved = path.resolve(root, relativePath);
  const rel = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new SessionPathError(`Refusing path outside session root: ${relativePath}`);
  }
  return resolved;
}

function isErrno(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}
