import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedDatabase } from "./seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../../data");
const dbPath = path.join(dataDir, "short-drama.sqlite");
const schemaPathCandidates = [
  path.join(__dirname, "schema.sql"),
  path.resolve(__dirname, "../../src/db/schema.sql")
];

let db: DatabaseSync | null = null;

export function getDatabase() {
  if (!db) {
    fs.mkdirSync(dataDir, { recursive: true });
    db = new DatabaseSync(dbPath);
    db.exec("PRAGMA foreign_keys = ON;");
  }

  return db;
}

export function initializeDatabase() {
  const database = getDatabase();
  const schemaPath = schemaPathCandidates.find((candidate) => fs.existsSync(candidate));

  if (!schemaPath) {
    throw new Error("SQLite schema file was not found.");
  }

  const schema = fs.readFileSync(schemaPath, "utf8");
  database.exec(schema);
  seedDatabase(database);
}
