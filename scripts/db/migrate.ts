import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

/**
 * Applies every migration in supabase/migrations in order, once.
 * Needs SUPABASE_DB_URL, the connection string from the project settings.
 */
async function main(): Promise<void> {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL mangler. Se .env.example.");

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  await client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const { rows } = await client.query<{ name: string }>("select name from schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ${file} er kørt`);
      continue;
    }
    const sql = await readFile(path.join(dir, file), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`✓ ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw new Error(`${file} fejlede: ${(error as Error).message}`);
    }
  }

  await client.end();
  console.log("Migrationer kørt.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
