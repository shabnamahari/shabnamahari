/**
 * Applies every SQL file in supabase/migrations, in filename order.
 *
 *   npx tsx scripts/migrate.ts
 *
 * Each file runs inside a transaction and is recorded in `schema_migrations`,
 * so a second run is a no-op and a failure part-way through leaves nothing
 * half-applied.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import "./load-env";
import { Client } from "pg";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  const client = new Client({
    connectionString,
    // Supabase terminates TLS with a certificate this client has no root for.
    // The connection is still encrypted; only the chain is unverified.
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const applied = new Set(
      (await client.query<{ name: string }>("select name from schema_migrations"))
        .rows.map((row) => row.name),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    let ran = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`· ${file} (already applied)`);
        continue;
      }

      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [
          file,
        ]);
        await client.query("commit");
        console.log(`✓ ${file}`);
        ran += 1;
      } catch (error) {
        await client.query("rollback");
        console.error(`✗ ${file}`);
        throw error;
      }
    }

    console.log(
      ran === 0
        ? "\nNothing to apply — schema is up to date."
        : `\nApplied ${ran} migration${ran === 1 ? "" : "s"}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("\n" + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
