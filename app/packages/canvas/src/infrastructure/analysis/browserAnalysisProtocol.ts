import type { LiteScanSourceFile } from '../../application/analysis/liteScanTypes';
import type { BrowserAnalysisResult } from '../../application/analysis/runBrowserAnalysis';

export type BrowserAnalysisRequest = {
  type: 'scan';
  sources: readonly LiteScanSourceFile[];
  directoryName: string;
};

export type BrowserAnalysisCancel = { type: 'cancel' };

export type BrowserAnalysisCommand = BrowserAnalysisRequest | BrowserAnalysisCancel;

export type BrowserAnalysisLogRecord = {
  type: 'log';
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
};

export type BrowserAnalysisResponse =
  | ({ type: 'result' } & BrowserAnalysisResult)
  | { type: 'error'; message: string; cancelled: boolean }
  | BrowserAnalysisLogRecord;
