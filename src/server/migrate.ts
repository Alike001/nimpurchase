import { readFile } from 'node:fs/promises'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required.')

const pool = new Pool({ connectionString: databaseUrl })
const migrationName = '001_initial_schema'
const bundledSchemaMigrations = [
  '002_purchase_item_description',
  '003_merchant_auth',
  '004_support_auth',
]

async function hasMigration(name: string): Promise<boolean> {
  const result = await pool.query<{ name: string }>('SELECT name FROM schema_migrations WHERE name = $1', [name])
  return Boolean(result.rowCount)
}

async function tableExists(name: string): Promise<boolean> {
  const result = await pool.query<{ table: string | null }>("SELECT to_regclass($1) AS table", [`public.${name}`])
  return Boolean(result.rows[0]?.table)
}

async function applyOrRecordExistingMigration(name: string, source: URL, table: string): Promise<void> {
  if (await hasMigration(name)) return
  if (await tableExists(table)) {
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
    console.log(`Recorded existing ${name}.`)
    return
  }
  await applyMigration(name, source)
}

async function applyMigration(name: string, source: URL): Promise<void> {
  if (await hasMigration(name)) return
  const sql = await readFile(source, 'utf8')
  await pool.query('BEGIN')
  try {
    await pool.query(sql)
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
    await pool.query('COMMIT')
    console.log(`Applied ${name}.`)
  } catch (error) {
    await pool.query('ROLLBACK')
    throw error
  }
}

try {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
  let initializedFromCurrentSchema = false
  if (!await hasMigration(migrationName)) {
    const existing = await pool.query<{ purchases: string | null }>("SELECT to_regclass('public.purchases') AS purchases")
    if (existing.rows[0]?.purchases) {
      // A database initialized by the original SQL command is compatible with
      // this initial migration; record it without trying to recreate its tables.
      await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migrationName])
      console.log('Recorded the existing NimPurchase schema.')
    } else {
      await applyMigration(migrationName, new URL('../../db/schema.sql', import.meta.url))
      // schema.sql represents the current complete schema for a brand-new
      // database, including the bundled migrations below.
      initializedFromCurrentSchema = true
    }
  }
  if (initializedFromCurrentSchema) {
    for (const name of bundledSchemaMigrations) {
      await pool.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [name])
      console.log(`Recorded ${name} from the current schema.`)
    }
  } else {
    await applyMigration('002_purchase_item_description', new URL('../../db/migrations/002_add_purchase_item_description.sql', import.meta.url))
    await applyOrRecordExistingMigration('003_merchant_auth', new URL('../../db/migrations/003_add_merchant_auth.sql', import.meta.url), 'merchant_auth_challenges')
    await applyOrRecordExistingMigration('004_support_auth', new URL('../../db/migrations/004_add_support_auth.sql', import.meta.url), 'support_auth_challenges')
  }
  console.log('Database schema is up to date.')
} finally {
  await pool.end()
}
