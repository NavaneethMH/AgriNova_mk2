import { describe, expect, it } from "vitest";

describe("configured satellite-analysis service", () => {
  it.skipIf(!/^https:\/\//.test(process.env.SATELLITE_ANALYSIS_URL ?? ""))("accepts the configured service key on its lightweight health endpoint", async () => {
    const baseUrl = process.env.SATELLITE_ANALYSIS_URL;
    const apiKey = process.env.SATELLITE_ANALYSIS_API_KEY;
    expect(baseUrl, "SATELLITE_ANALYSIS_URL must point to the deployed Cloud Run service").toBeTruthy();

    const response = await fetch(`${baseUrl!.replace(/\/$/, "")}/healthz`, {
      headers: apiKey ? { "X-AgriNova-Service-Key": apiKey } : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    expect(response.ok, `Satellite service health check failed with ${response.status}`).toBe(true);
  });
});
