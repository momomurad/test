import express from 'express';

export function createApp(pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (req, res) => res.json({ status: 'up' }));
  app.get('/api/ready', async (req, res) => {
    try { await pool.query('SELECT 1'); res.json({ status: 'ready' }); }
    catch { res.status(503).json({ error: 'Database unavailable' }); }
  });
  app.get('/api/tasks', async (req, res) => {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC, id DESC');
    res.json(result.rows);
  });
  const validate = (req, res, next) => {
    const { title, description = '', status = 'todo' } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 160 ||
        typeof description !== 'string' || description.length > 2000 ||
        !['todo', 'doing', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Enter a title (1–160 characters), description up to 2000 characters, and a valid status.' });
    }
    req.task = [title.trim(), description.trim(), status];
    next();
  };
  app.param('id', (req, res, next, id) => {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return res.status(400).json({ error: 'Invalid task ID' });
    next();
  });
  app.post('/api/tasks', validate, async (req, res) => {
    const result = await pool.query('INSERT INTO tasks (title, description, status) VALUES ($1,$2,$3) RETURNING *', req.task);
    res.status(201).json(result.rows[0]);
  });
  app.put('/api/tasks/:id', validate, async (req, res) => {
    const result = await pool.query('UPDATE tasks SET title=$1, description=$2, status=$3, updated_at=NOW() WHERE id=$4 RETURNING *', [...req.task, req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  });
  app.delete('/api/tasks/:id', async (req, res) => {
    const result = await pool.query('DELETE FROM tasks WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Task not found' });
    res.status(204).end();
  });
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
    console.error('Request failed:', err.code || err.name);
    res.status(500).json({ error: 'Unable to complete request. Please try again.' });
  });
  return app;
}
