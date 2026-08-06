// Aplica os arquivos SQL de supabase/migrations via CONNECTION STRING direta
// (Postgres do Supabase), sem depender do SQL Editor.
//
// Uso:
//   DATABASE_URL="postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres" \
//   npm run db:migrate
//
// É idempotente: registra o que já rodou na tabela public._migrations e pula.
// Use a string "Direct connection" ou "Session pooler" do Supabase
// (Settings > Database). Evite a "Transaction pooler" (porta 6543) aqui —
// ela não suporta bem DDL/funções em transação.

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "..", "supabase", "migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("✗ Defina DATABASE_URL (connection string direta do Supabase).");
  process.exit(1);
}

// Supabase exige SSL. rejectUnauthorized:false aceita o cert gerenciado deles.
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  await client.query(`
    create table if not exists public._migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 0001..., 0002... na ordem correta

  let applied = 0;
  for (const file of files) {
    const { rowCount } = await client.query(
      "select 1 from public._migrations where name = $1",
      [file]
    );
    if (rowCount) {
      console.log(`• já aplicada: ${file}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    console.log(`→ aplicando: ${file}`);
    try {
      await client.query("begin");
      await client.query(sql); // executa o arquivo inteiro (múltiplos statements)
      await client.query("insert into public._migrations(name) values ($1)", [file]);
      await client.query("commit");
      console.log(`✓ ok: ${file}`);
      applied++;
    } catch (err) {
      await client.query("rollback");
      console.error(`✗ falhou em ${file}: ${err.message}`);
      throw err;
    }
  }

  console.log(
    applied === 0
      ? "Nada novo — banco já está atualizado."
      : `Concluído: ${applied} migration(s) aplicada(s).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
