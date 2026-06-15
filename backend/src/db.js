import knex from "knex";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = config.dbFile;
const resolvedPath = path.isAbsolute(dbFile) ? dbFile : path.join(__dirname, "..", dbFile);
const databaseUrl = process.env.DATABASE_URL?.trim();

const db = knex(databaseUrl ? {
  client: "pg",
  connection: databaseUrl,
} : {
  client: "sqlite3",
  connection: { filename: resolvedPath },
  useNullAsDefault: true,
});

export default db;
