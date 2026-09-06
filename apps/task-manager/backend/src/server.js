import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { createApp } from './app.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000 });
pool.on('error', err => console.error('Database connection error:', err.code));
await pool.query(await readFile(new URL('../migrations/001-tasks.sql', import.meta.url), 'utf8'));
const server = createApp(pool).listen(process.env.PORT || 3001, '0.0.0.0', () => console.log('Task API listening on port ' + (process.env.PORT || 3001)));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  server.close(async () => { await pool.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
});
