import express from 'express';

const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];
const requestMetrics = new Map();

function normalizePath(path) {
  return path.replace(/^\/api\/tasks\/\d+$/, '/api/tasks/:id');
}

function metricKey(method, path, status) {
  return `${method} ${normalizePath(path)} ${status}`;
}

function recordRequest(method, path, status, durationSeconds) {
  const key = metricKey(method, path, status);
  const current = requestMetrics.get(key) ?? { method, path: normalizePath(path), status, count: 0, sum: 0, buckets: buckets.map(() => 0) };
  current.count += 1;
  current.sum += durationSeconds;
  buckets.forEach((bucket, index) => {
    if (durationSeconds <= bucket) current.buckets[index] += 1;
  });
  requestMetrics.set(key, current);
}

function escapeLabel(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function labels(values) {
  return Object.entries(values).map(([key, value]) => `${key}="${escapeLabel(value)}"`).join(',');
}

function renderMetrics() {
  const memory = process.memoryUsage();
  const lines = [
    '# HELP taskroom_up Taskroom backend process health.',
    '# TYPE taskroom_up gauge',
    'taskroom_up 1',
    '# HELP taskroom_process_uptime_seconds Taskroom backend process uptime in seconds.',
    '# TYPE taskroom_process_uptime_seconds gauge',
    `taskroom_process_uptime_seconds ${process.uptime().toFixed(3)}`,
    '# HELP taskroom_process_memory_bytes Taskroom backend memory usage in bytes.',
    '# TYPE taskroom_process_memory_bytes gauge',
    `taskroom_process_memory_bytes{type="rss"} ${memory.rss}`,
    `taskroom_process_memory_bytes{type="heapUsed"} ${memory.heapUsed}`,
    `taskroom_process_memory_bytes{type="heapTotal"} ${memory.heapTotal}`,
    '# HELP taskroom_http_requests_total Total HTTP requests handled by the Taskroom backend.',
    '# TYPE taskroom_http_requests_total counter',
    '# HELP taskroom_http_request_duration_seconds HTTP request duration in seconds.',
    '# TYPE taskroom_http_request_duration_seconds histogram'
  ];

  for (const metric of requestMetrics.values()) {
    const baseLabels = { method: metric.method, route: metric.path, status: metric.status };
    lines.push(`taskroom_http_requests_total{${labels(baseLabels)}} ${metric.count}`);
    buckets.forEach((bucket, index) => {
      lines.push(`taskroom_http_request_duration_seconds_bucket{${labels({ ...baseLabels, le: bucket })}} ${metric.buckets[index]}`);
    });
    lines.push(`taskroom_http_request_duration_seconds_bucket{${labels({ ...baseLabels, le: '+Inf' })}} ${metric.count}`);
    lines.push(`taskroom_http_request_duration_seconds_sum{${labels(baseLabels)}} ${metric.sum.toFixed(6)}`);
    lines.push(`taskroom_http_request_duration_seconds_count{${labels(baseLabels)}} ${metric.count}`);
  }

  return `${lines.join('\n')}\n`;
}

export function createApp(pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      if (req.path === '/metrics') return;
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
      recordRequest(req.method, req.route?.path ?? req.path, res.statusCode, durationSeconds);
    });
    next();
  });
  app.get('/metrics', (req, res) => {
    res.type('text/plain; version=0.0.4; charset=utf-8').send(renderMetrics());
  });
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
