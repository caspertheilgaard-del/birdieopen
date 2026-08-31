import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Snapshot } from "./snapshot-type";

/**
 * The imported history as a single JSON file. Used for local development and as
 * the build-time source until the Supabase project is connected.
 */
let cached: Snapshot | null = null;

export async function loadSnapshot(): Promise<Snapshot> {
  if (cached) return cached;
  const file = path.join(process.cwd(), "data", "snapshot.json");
  cached = JSON.parse(await readFile(file, "utf8")) as Snapshot;
  return cached;
}
