import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database';

// 支援多種路徑（開發環境 vs Docker 環境）
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || join(__dirname, 'migrations');

async function runMigration(filename: string) {
  const filePath = join(MIGRATIONS_DIR, filename);
  const sql = readFileSync(filePath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✅ Migration ${filename} completed successfully`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Migration ${filename} failed:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const migrationFile = process.argv[2] || '002_add_missing_features.sql';
  
  console.log(`Running migration: ${migrationFile}`);
  
  try {
    await runMigration(migrationFile);
    console.log('✅ All migrations completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { runMigration };

