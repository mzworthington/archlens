import { z } from 'zod';

const forensicClassificationSchema = z.enum(['hotspot', 'knowledge-silo']);

const coupledFileForensicsSchema = z.object({
  path: z.string().min(1),
  score: z.number(),
  sharedCommits: z.number(),
});

const forensicAuthorSchema = z.object({
  email: z.string().min(1),
  commits: z.number().nonnegative(),
});

export const nodeForensicsSchema = z.object({
  complexity: z.number().optional(),
  complexityPeak: z.number().optional(),
  cognitiveComplexity: z.number().optional(),
  functionCount: z.number().nonnegative().optional(),
  loc: z.number().optional(),
  sloc: z.number().optional(),
  churn: z.number().optional(),
  lineChurn: z.number().optional(),
  churn30: z.number().optional(),
  churn365: z.number().optional(),
  churnByWeek: z.array(z.number().nonnegative()).optional(),
  hotspotScoreByWeek: z.array(z.number().nonnegative()).optional(),
  authorCount: z.number().optional(),
  topAuthorPercent: z.number().optional(),
  authors: z.array(forensicAuthorSchema).optional(),
  hotspotScore: z.number().optional(),
  classifications: z.array(forensicClassificationSchema).optional(),
  coupledFiles: z.array(coupledFileForensicsSchema).optional(),
  sinceDays: z.number().positive().optional(),
  fileCount: z.number().optional(),
  hotspotCount: z.number().optional(),
  knowledgeSiloCount: z.number().optional(),
});
