import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const labels = { todo: 'To do', doing: 'In progress', done: 'Done' };
const blank = { title: '', description: '', status: 'todo' };
async function api(path = '', options = {}) {
  const res = await fetch('/api/tasks' + path, { ...options, headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'Unable to reach your tasks. Please try again.'); }
  return res.status === 204 ? null : res.json();
}
function App() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const titleInput = useRef(null);
  async function load() {
    setLoading(true); setError('');
    try { setTasks(await api()); } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function save(e) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const task = await api(editing ? '/' + editing : '', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(form) });
      setTasks(prev => editing ? prev.map(t => t.id === editing ? task : t) : [task, ...prev]);
      setMessage(editing ? 'Task updated.' : 'Task added.'); setForm(blank); setEditing(null);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove(task) {
    if (!window.confirm('Delete “' + task.title + '”?')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/' + task.id, { method: 'DELETE' }); setTasks(prev => prev.filter(t => t.id !== task.id));
      if (editing === task.id) { setEditing(null); setForm(blank); }
      setMessage('Task deleted.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="workspace">
    <header><a className="brand" href="/">▦ <span>taskroom</span></a><span className="workspace-label">PERSONAL WORKSPACE</span></header>
    <main>
      <section className="heading"><div><p className="eyebrow">A LITTLE FOCUS, EVERY DAY</p><h1>Make room for progress.</h1><p>Capture what matters. Take it one task at a time.</p></div><div className="count"><strong>{tasks.filter(t => t.status === 'done').length}<span> / {tasks.length}</span></strong><span>tasks completed</span></div></section>
      <div className="notice" role="status" aria-live="polite">{message}</div>
      {error && <div className="error" role="alert">{error} <button onClick={load} disabled={busy || loading}>Retry connection</button></div>}
      <div className="layout">
        <aside><form onSubmit={save}><div className="form-heading"><span className="accent">＋</span><h2>{editing ? 'Edit task' : 'New task'}</h2></div>
          <label htmlFor="title">Task name</label><input ref={titleInput} id="title" value={form.title} maxLength={160} required placeholder="What needs to get done?" disabled={busy} onChange={e => setForm({ ...form, title: e.target.value })}/>
          <label htmlFor="description">Notes <span className="optional">optional</span></label><textarea id="description" value={form.description} maxLength={2000} rows={4} placeholder="Add a little context…" disabled={busy} onChange={e => setForm({ ...form, description: e.target.value })}/>
          <label htmlFor="status">Status</label><select id="status" value={form.status} disabled={busy} onChange={e => setForm({ ...form, status: e.target.value })}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <button className="primary" disabled={busy || loading}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add task →'}</button>
          {editing && <button type="button" className="cancel" disabled={busy} onClick={() => { setForm(blank); setEditing(null); }}>Cancel editing</button>}
        </form><p className="aside-note">Small steps add up.<br/>Your next one starts here.</p></aside>
        <section className="board" aria-label="Your tasks">{Object.entries(labels).map(([status, label]) => <section className={'column ' + status} key={status}><div className="column-title"><h2><span className="dot"/>{label}</h2><span>{tasks.filter(t => t.status === status).length}</span></div>
          {loading ? <p className="empty">Loading tasks…</p> : tasks.filter(t => t.status === status).length === 0 ? <div className="empty"><span>—</span><p>{status === 'todo' ? 'A clear space for your next idea.' : status === 'doing' ? 'Ready when you are.' : 'Good things take a first step.'}</p></div> : tasks.filter(t => t.status === status).map(task => <article key={task.id}><span className={'badge ' + status}>{label}</span><h3>{task.title}</h3>{task.description && <p className="description">{task.description}</p>}<div className="card-footer"><time dateTime={task.created_at}>{new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time><div><button disabled={busy} aria-label={'Edit ' + task.title} onClick={() => { setEditing(task.id); setForm({ title: task.title, description: task.description, status: task.status }); titleInput.current?.focus(); }}>Edit</button><button disabled={busy} className="delete" aria-label={'Delete ' + task.title} onClick={() => remove(task)}>Delete</button></div></div></article>)}
        </section>)}</section>
      </div>
      <footer>ONE TASK AT A TIME.<span>Built for a little more clarity.</span></footer>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
