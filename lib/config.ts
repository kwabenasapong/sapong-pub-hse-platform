import { prisma } from "./prisma";

// ── Hardcoded defaults (last resort fallback) ─────────────────────────────────
const DEFAULTS: Record<string, string> = {
  anthropicModel:    "claude-sonnet-4-6",
  exportFont:        "Georgia",
  exportPageSize:    "letter",
  exchangeRateGHS:   "15.5",
  usageLogRetention: "12",
};

// ── ENV key mappings ──────────────────────────────────────────────────────────
const ENV_KEYS: Record<string, string> = {
  anthropicApiKey: "ANTHROPIC_API_KEY",
  anthropicModel:  "ANTHROPIC_MODEL",
  exportFont:      "EXPORT_FONT",
  exportPageSize:  "EXPORT_PAGE_SIZE",
};

// ── Read a single config value ────────────────────────────────────────────────
// Priority: PlatformConfig DB → process.env → DEFAULTS
export async function getConfig(key: string): Promise<string> {
  try {
    const row = await prisma.platformConfig.findUnique({ where: { key } });
    if (row?.value) return row.value;
  } catch {
    // DB unavailable — fall through to env
  }

  const envKey = ENV_KEYS[key];
  if (envKey && process.env[envKey]) return process.env[envKey]!;

  return DEFAULTS[key] ?? "";
}

// ── Read all config values (for settings UI) ──────────────────────────────────
export async function getAllConfig(): Promise<Record<string, { value: string; source: "db" | "env" | "default" }>> {
  const keys = ["anthropicApiKey", "anthropicModel", "exportFont", "exportPageSize", "exchangeRateGHS", "usageLogRetention"];
  const result: Record<string, { value: string; source: "db" | "env" | "default" }> = {};

  let dbRows: Record<string, string> = {};
  try {
    const rows = await prisma.platformConfig.findMany();
    dbRows = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch { /* DB unavailable */ }

  for (const key of keys) {
    if (dbRows[key] !== undefined) {
      // Mask API key value
      const value = key === "anthropicApiKey"
        ? (dbRows[key] ? "••••••••" + dbRows[key].slice(-4) : "")
        : dbRows[key];
      result[key] = { value, source: "db" };
    } else {
      const envKey = ENV_KEYS[key];
      const envVal = envKey ? process.env[envKey] : undefined;
      if (envVal) {
        const value = key === "anthropicApiKey"
          ? "••••••••" + envVal.slice(-4)
          : envVal;
        result[key] = { value, source: "env" };
      } else {
        result[key] = { value: DEFAULTS[key] ?? "", source: "default" };
      }
    }
  }

  return result;
}

// ── Write a config value ──────────────────────────────────────────────────────
export async function setConfig(key: string, value: string): Promise<void> {
  await prisma.platformConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// ── Delete a config value (revert to env/default) ────────────────────────────
export async function deleteConfig(key: string): Promise<void> {
  try {
    await prisma.platformConfig.delete({ where: { key } });
  } catch { /* Key didn't exist — fine */ }
}
