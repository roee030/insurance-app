import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  publicBaseUrl: required("PUBLIC_BASE_URL", "http://localhost:4000"),
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5199")
    .split(",")
    .map((s) => s.trim()),

  mislaka: {
    mode: (process.env.MISLAKA_MODE ?? "mock") as "mock" | "live",
    baseUrl: required("MISLAKA_BASE_URL", "https://mislaka-api.co.il/api"),
    token: process.env.MISLAKA_TOKEN ?? "",
    senderId: process.env.MISLAKA_SENDER_ID ?? "",
  },

  mock: {
    webhookDelayMs: Number(process.env.MOCK_WEBHOOK_DELAY_MS ?? 6000),
  },
} as const;

/** The URL Mislaka will POST to when a transaction finishes. */
export const webhookUrl = `${config.publicBaseUrl}/api/webhooks/mislaka`;
