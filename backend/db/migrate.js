#!/usr/bin/env node

import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "migrations");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://facundogg@localhost:5432/made_in_chaco",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getApplied(client) {
  const { rows } = await client.query("SELECT version FROM schema_migrations ORDER BY version");
  return new Set(rows.map((r) => r.version));
}

async function getMigrationFiles() {
  return (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
}

async function runMigrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureTable(client);

    const applied = await getApplied(client);
    const files = await getMigrationFiles();
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("All migrations already applied.");
      await client.query("COMMIT");
      return;
    }

    for (const file of pending) {
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf-8");
      console.log("  Applying:", file);
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
    }

    await client.query("COMMIT");
    console.log("Applied", pending.length, "migration(s).");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

async function runStatus() {
  const client = await pool.connect();
  try {
    await ensureTable(client);
    const applied = await getApplied(client);
    const files = await getMigrationFiles();

    console.log("");
    console.log("Migration Status:");
    console.log("");
    for (const file of files) {
      const status = applied.has(file) ? "  applied" : "  pending ";
      console.log("  " + status + "  " + file);
    }
    const pending = files.filter((f) => !applied.has(f));
    console.log("");
    console.log("  " + files.length + " total, " + applied.size + " applied, " + pending.length + " pending");
    console.log("");
  } finally {
    client.release();
  }
}

async function runInit() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureTable(client);

    const applied = await getApplied(client);
    const files = await getMigrationFiles();
    const untracked = files.filter((f) => !applied.has(f));

    if (untracked.length === 0) {
      console.log("All migrations already tracked.");
      await client.query("COMMIT");
      return;
    }

    console.log("Marking", untracked.length, "existing migration(s) as applied (no SQL executed)...");
    console.log("");

    for (const file of untracked) {
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
      console.log("  tracked:", file);
    }

    await client.query("COMMIT");
    console.log("");
    console.log("All", untracked.length, "migration(s) tracked. Run 'db:migrate' for any future migrations.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Init failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

const args = process.argv.slice(2);

try {
  if (args.includes("--status")) {
    await runStatus();
  } else if (args.includes("--init")) {
    await runInit();
  } else {
    await runMigrate();
  }
} finally {
  await pool.end();
}
