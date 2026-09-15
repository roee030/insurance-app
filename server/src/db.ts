import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DB } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "data", "db.json");

const empty: DB = { clients: [] };

let cache: DB | null = null;
let writing: Promise<void> = Promise.resolve();

async function load(): Promise<DB> {
  if (cache) return cache;
  if (!existsSync(DB_PATH)) {
    cache = structuredClone(empty);
    return cache;
  }
  try {
    const txt = await readFile(DB_PATH, "utf8");
    cache = { ...empty, ...(JSON.parse(txt) as DB) };
  } catch {
    cache = structuredClone(empty);
  }
  return cache;
}

/** Serialised atomic write (write to temp then rename). */
async function persist(db: DB): Promise<void> {
  writing = writing.then(async () => {
    await mkdir(dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.tmp`;
    await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await rename(tmp, DB_PATH);
  });
  return writing;
}

/** Read the DB (cached in memory). */
export async function getDB(): Promise<DB> {
  return load();
}

/** Mutate the DB via a callback, then persist. Returns the callback result. */
export async function updateDB<T>(fn: (db: DB) => T): Promise<T> {
  const db = await load();
  const result = fn(db);
  await persist(db);
  return result;
}
