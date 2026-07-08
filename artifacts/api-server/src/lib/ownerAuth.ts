import { eq } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";

const OWNER_PIN_KEY = "owner_pin";
const DEFAULT_PIN = process.env.OWNER_PIN || "samurai2024";

let cachedPin: string | null = null;

async function loadPin(): Promise<string> {
  if (cachedPin !== null) return cachedPin;

  const [row] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, OWNER_PIN_KEY));

  if (row) {
    cachedPin = row.value;
    return cachedPin;
  }

  await db
    .insert(appSettingsTable)
    .values({ key: OWNER_PIN_KEY, value: DEFAULT_PIN })
    .onConflictDoNothing();

  cachedPin = DEFAULT_PIN;
  return cachedPin;
}

export async function checkPin(candidate: unknown): Promise<boolean> {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  const current = await loadPin();
  return candidate === current;
}

export async function setOwnerPin(newPin: string): Promise<void> {
  await db
    .insert(appSettingsTable)
    .values({ key: OWNER_PIN_KEY, value: newPin, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value: newPin, updatedAt: new Date() },
    });
  cachedPin = newPin;
}
