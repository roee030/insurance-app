import { config } from "../config.js";
import type { MislakaClient } from "./client.js";
import { LiveMislakaClient } from "./live.js";
import { MockMislakaClient } from "./mock.js";

/** Single shared client, selected by MISLAKA_MODE. */
export const mislaka: MislakaClient =
  config.mislaka.mode === "live"
    ? new LiveMislakaClient()
    : new MockMislakaClient();

export type { MislakaClient } from "./client.js";
