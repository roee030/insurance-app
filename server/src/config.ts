import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5199")
    .split(",")
    .map((s) => s.trim()),

  mislaka: {
    mode: (process.env.MISLAKA_MODE ?? "mock") as "mock" | "live",
    baseUrl: required("MISLAKA_BASE_URL", "https://mislaka-api.co.il/api"),
    token: process.env.MISLAKA_TOKEN ?? "",
    /** The agent's ID number — reserved for the future ניוד (1700) integration. */
    senderId: process.env.MISLAKA_SENDER_ID ?? "",
  },
} as const;
