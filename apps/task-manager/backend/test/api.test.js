import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { createApp } from '../src/app.js';

test('API CRUD, validation and database persistence', async () => {
  assert.ok(process.env.DATABASE_URL, 'Run integration tests with a dedicated configured database');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(await readFile(new URL('../migrations/001-tasks.sql', import.meta.url), 'utf8'));
  const server = createApp(pool).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const request = (path, method = 'GET', body) => fetch(url + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  let id;
  try {
    assert.equal((await request('/api/ready')).status, 200);
    assert.equal((await request('/api/tasks', 'POST', { title: '   ' })).status, 400);
    assert.equal((await request('/api/tasks', 'POST', { title: 'Invalid', status: 'unknown' })).status, 400);
    assert.equal((await request('/api/tasks', 'POST', { title: 'x'.repeat(161) })).status, 400);
    assert.equal((await request('/api/tasks/abc', 'DELETE')).status, 400);
    const create = await request('/api/tasks', 'POST', { title: "Test: 'quoted' task", description: 'integration test', status: 'todo' });
    assert.equal(create.status, 201);
    const task = await create.json(); id = task.id;
    assert.equal(task.title, "Test: 'quoted' task");
    assert.ok((await (await request('/api/tasks')).json()).some(t => t.id === id));
    const update = await request('/api/tasks/' + id, 'PUT', { title: 'Updated task', description: 'Saved', status: 'done' });
    assert.equal(update.status, 200);
    assert.equal((await update.json()).status, 'done');
    const persisted = await pool.query('SELECT title, status FROM tasks WHERE id=$1', [id]);
    assert.deepEqual(persisted.rows[0], { title: 'Updated task', status: 'done' });
    assert.equal((await request('/api/tasks/' + id, 'DELETE')).status, 204);
    assert.equal((await request('/api/tasks/' + id, 'DELETE')).status, 404);
    assert.equal((await request('/api/tasks/' + id, 'PUT', { title: 'Missing' })).status, 404);
    assert.equal((await pool.query('SELECT id FROM tasks WHERE id=$1', [id])).rowCount, 0);
    const malformed = await fetch(url + '/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
    assert.equal(malformed.status, 400);
  } finally {
    if (id) await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});

test('readiness reports database outage without exposing internals', async () => {
  const pool = { query: async () => { throw new Error('private database detail'); } };
  const server = createApp(pool).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/ready');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Database unavailable' });
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('metrics endpoint exposes Prometheus text and request counters', async () => {
  const pool = { query: async () => ({ rows: [] }) };
  const server = createApp(pool).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  try {
    assert.equal((await fetch(url + '/api/health')).status, 200);
    const response = await fetch(url + '/metrics');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/plain/);
    const body = await response.text();
    assert.match(body, /# HELP taskroom_up/);
    assert.match(body, /taskroom_up 1/);
    assert.match(body, /taskroom_http_requests_total\{method="GET",route="\/api\/health",status="200"\} 1/);
    assert.match(body, /taskroom_http_request_duration_seconds_count\{method="GET",route="\/api\/health",status="200"\} 1/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
