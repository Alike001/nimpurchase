import { readFile } from 'node:fs/promises'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required.')

const pool = new Pool({ connectionString: databaseUrl })
const migrationName = '001_initial_schema'

try {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
  const applied = await pool.query<{ name: string }>('SELECT name FROM schema_migrations WHERE name = $1', [migrationName])
  if (applied.rowCount) {
    console.log('Database schema is already up to date.')
  } else {
    const existing = await pool.query<{ purchases: string | null }>("SELECT to_regclass('public.purchases') AS purchases")
    if (existing.rows[0]?.purchases) {
      // A database initialized by the original SQL command is compatible with
      // this initial migration; record it without trying to recreate its tables.
      await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migrationName])
      console.log('Recorded the existing NimPurchase schema.')
    } else {
      const schema = await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8')
      await pool.query('BEGIN')
      try {
        await pool.query(schema)
        await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migrationName])
        await pool.query('COMMIT')
        console.log('Applied NimPurchase database schema.')
      } catch (error) {
        await pool.query('ROLLBACK')
        throw error
      }
    }
  }
} finally {
  await pool.end()
}
