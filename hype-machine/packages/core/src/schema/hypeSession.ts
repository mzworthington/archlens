import { z } from "zod";

export const FeatureFrameSchema = z.object({
  tSec: z.number().nonnegative(),
  acousticEnergy: z.number().min(0).max(1).optional(),
  kineticEnergy: z.number().min(0).max(1).optional(),
});

export const DjActionSchema = z.object({
  tSec: z.number().nonnegative(),
  action: z.string().min(1),
});

export const StreamRefSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["room_mic", "booth", "master", "camera", "mixer_midi", "other"]),
  path: z.string().min(1),
});

export const HypeSessionSchema = z.object({
  schemaVersion: z.literal("0.1.0"),
  sessionId: z.string().min(1),
  title: z.string().optional(),
  venue: z.string().optional(),
  startedAt: z.string().datetime({ offset: true }).optional(),
  durationSec: z.number().positive().optional(),
  streams: z.array(StreamRefSchema).default([]),
  privacy: z
    .object({
      facesBlurred: z.boolean().default(false),
      localOnly: z.boolean().default(true),
    })
    .default({ facesBlurred: false, localOnly: true }),
});

export type HypeSessionManifest = z.infer<typeof HypeSessionSchema>;

export function parseHypeSessionManifest(input: unknown): HypeSessionManifest {
  return HypeSessionSchema.parse(input);
}

export const SessionFeaturesSchema = z.object({
  frames: z.array(FeatureFrameSchema).min(1),
});

export const SessionActionsSchema = z.object({
  actions: z.array(DjActionSchema),
});
