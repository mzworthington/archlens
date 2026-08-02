import { describe, expect, it } from "vitest";

import { parseHypeSessionManifest } from "./hypeSession.js";

describe("HypeSessionSchema", () => {
  it("parses a valid manifest", () => {
    const manifest = parseHypeSessionManifest({
      schemaVersion: "0.1.0",
      sessionId: "fixture-warehouse-01",
      title: "Warehouse warm-up",
      streams: [
        { id: "room-l", role: "room_mic", path: "audio/room-l.wav" },
        { id: "cam-wide", role: "camera", path: "video/wide.mp4" },
      ],
      privacy: { facesBlurred: true, localOnly: true },
    });

    expect(manifest.sessionId).toBe("fixture-warehouse-01");
    expect(manifest.streams).toHaveLength(2);
    expect(manifest.privacy.localOnly).toBe(true);
  });

  it("rejects unknown schema versions", () => {
    expect(() =>
      parseHypeSessionManifest({
        schemaVersion: "9.9.9",
        sessionId: "x",
      }),
    ).toThrow();
  });
});
