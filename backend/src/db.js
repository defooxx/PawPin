import knex from "knex";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = config.dbFile;
const resolvedPath = path.isAbsolute(dbFile) ? dbFile : path.join(__dirname, "..", dbFile);
const databaseUrl = process.env.DATABASE_URL?.trim();
const databaseSsl = process.env.DATABASE_SSL === "true"
  || /[?&]sslmode=require(?:&|$)/i.test(databaseUrl || "");

if (!databaseUrl) {
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
}

const db = knex(databaseUrl ? {
  client: "pg",
  connection: {
    connectionString: databaseUrl,
    ...(databaseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  },
} : {
  client: "sqlite3",
  connection: { filename: resolvedPath },
  useNullAsDefault: true,
});

export const databaseMode = databaseUrl ? "postgresql" : "sqlite";
export default db;
