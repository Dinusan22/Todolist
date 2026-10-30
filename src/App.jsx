import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Check, CheckCheck, CircleHelp, ClipboardList, LoaderCircle, LogIn, LogOut, Moon, Pencil, Plus, RefreshCw, Search, SearchX, Sun, Trash2, X } from 'lucide-react';
import Dialog from './components/Dialog.jsx';
import AuthPage from './components/AuthPage.jsx';
import TaskEditDialog from './components/TaskEditDialog.jsx';
import { api, ApiError } from './services/api.js';
import { DEMO_STORAGE_KEY, loadDemoTasks } from './data/demoTasks.js';

const SESSION_KEY = 'todo-minimal-session-v1';
function readScreen() {
  if (window.location.hash === '#/sign-up') {
    return 'sign-up';
  }

  return 'sign-in';
}
function readSession() {
  try { const value = JSON.parse(sessionStorage.getItem(SESSION_KEY)); return value && typeof value.token === 'string' && typeof value.email === 'string' ? value : null; } catch { return null; }
}
function readTheme() {
  try { return localStorage.getItem('todo-minimal-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { return 'light'; }
}
function normaliseTask(task) {
  if (!task || task.id === undefined || task.id === null || typeof task.title !== 'string') throw new ApiError('The backend returned an unexpected task. Refresh to check your saved tasks.');
  return { ...task, description: task.description || '', isCompleted: task.isCompleted === true };
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const [mode, setMode] = useState(() => readSession() ? 'backend' : 'demo');
  const [tasks, setTasks] = useState(() => readSession() ? [] : loadDemoTasks());
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [screen, setScreen] = useState(readScreen);
  const [authMessage, setAuthMessage] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [theme, setTheme] = useState(readTheme);
  const inputRef = useRef(null);
  const navigate = useCallback((next) => {
    setScreen(next);
    window.location.hash = next === 'tasks' ? '/' : `/${next}`;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const setAuthOpen = useCallback((open) => navigate(open ? 'sign-in' : 'tasks'), [navigate]);

  useEffect(() => {
    const syncScreen = () => setScreen(readScreen());
    window.addEventListener('hashchange', syncScreen);
    return () => window.removeEventListener('hashchange', syncScreen);
  }, []);

  useEffect(() => { document.title = screen === 'tasks' ? 'Todo. — Minimal list' : screen === 'sign-in' ? 'Sign in — Todo.' : 'Sign up — Todo.'; }, [screen]);

  const expireSession = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Continue without storage. */ }
    setSession(null); setTasks([]); setEditingTask(null); setDeleteTarget(null);
    setAuthMessage('Your session has ended. Sign in again to continue.'); setAuthOpen(true); setError('');
  }, [setAuthOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('todo-minimal-theme', theme); } catch { /* Continue without storage. */ }
  }, [theme]);

  useEffect(() => {
    if (!session?.token) return;
    try {
      const encoded = session.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const { exp } = JSON.parse(atob(encoded));
      if (typeof exp !== 'number') return;
      // UI convenience only. The backend validates the token on every protected request.
      const timer = setTimeout(expireSession, Math.min(Math.max(exp * 1000 - Date.now(), 0), 2147483647));
      return () => clearTimeout(timer);
    } catch { /* Let the backend validate an unrecognised token format. */ }
  }, [session?.token, expireSession]);

  useEffect(() => {
    setError('');
    if (mode === 'demo') { setTasks(loadDemoTasks()); setLoading(false); return; }
    if (!session?.token) { setTasks([]); setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setTasks([]);
    api.list(session.token, controller.signal).then((data) => {
      if (!controller.signal.aborted) setTasks(data.map(normaliseTask));
    }).catch((err) => {
      if (controller.signal.aborted) return;
      if (err.status === 401 || err.status === 403) expireSession(); else setError(err.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [mode, session?.token, refreshKey, expireSession]);

  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);

  function commit(next) {
    setTasks(next);
    if (mode === 'demo') {
      try { localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next)); }
      catch { setError('Your browser could not save demo tasks. They will remain available until you reload this page.'); }
    }
  }

  async function mutate(action) {
    if (busy) return false;
    if (mode === 'backend' && !session?.token) { setAuthOpen(true); return false; }
    setBusy(true); setError('');
    try { await action(); return true; }
    catch (err) { if (err.status === 401 || err.status === 403) expireSession(); else setError(err.message); return false; }
    finally { setBusy(false); }
  }

  async function addTask(event) {
    event.preventDefault(); const title = newTitle.trim(); if (!title) return;
    await mutate(async () => {
      const draft = { title, description: '', isCompleted: false };
      const id = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      const task = mode === 'demo' ? { ...draft, id: `demo-${id}` } : normaliseTask(await api.create(draft, session.token));
      commit([task, ...tasks]); setNewTitle(''); setFilter('all'); setSearch(''); setNotice('Task added. One step at a time.');
    });
  }

  async function saveTask(task) {
    return mutate(async () => {
      const updated = mode === 'demo' ? task : normaliseTask(await api.update(task, session.token));
      commit(tasks.map((item) => item.id === updated.id ? updated : item)); setNotice('Task updated.');
    });
  }

  async function deleteTask() {
    if (!deleteTarget) return;
    await mutate(async () => {
      if (mode === 'backend') await api.remove(deleteTarget.id, session.token);
      commit(tasks.filter((task) => task.id !== deleteTarget.id)); setDeleteTarget(null); setNotice('Task deleted.');
    });
  }

  function signIn(auth) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(auth)); } catch { /* Continue in memory. */ }
    setSession(auth); setMode('backend'); setAuthOpen(false); setAuthMessage(''); setFilter('all'); setSearch(''); setNotice('Signed in. Loading your tasks…');
  }

function switchToDemo() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Continue without storage.
  }

  setSession(null);
  setMode('backend');
  setTasks([]);
  setFilter('all');
  setSearch('');
  setError('');
  setNotice('');

  navigate('sign-in');
}

  const counts = useMemo(() => ({ all: tasks.length, pending: tasks.filter((task) => !task.isCompleted).length, completed: tasks.filter((task) => task.isCompleted).length }), [tasks]);
  const visibleTasks = useMemo(() => tasks.filter((task) => (filter === 'all' || task.isCompleted === (filter === 'completed')) && `${task.title} ${task.description}`.toLowerCase().includes(search.trim().toLowerCase())), [tasks, filter, search]);
  const percent = tasks.length ? Math.round(counts.completed / tasks.length * 100) : 0;
  const openAuth = () => { setAuthMessage(''); setAuthOpen(true); };
  const disabled = busy || loading || (mode === 'backend' && !session);

 if (screen !== 'tasks' || !session?.token) {
  return (
    <AuthPage
      view={screen === 'sign-up' ? 'sign-up' : 'sign-in'}
      message={authMessage}
      theme={theme}
      onThemeChange={() =>
        setTheme(theme === 'dark' ? 'light' : 'dark')
      }
      onNavigate={(next) => {
        setAuthMessage('');
        navigate(next);
      }}
      onSignedIn={signIn}
    />
  );
}

  return <>
    <a className="skip-link" href="#main-content">Skip to tasks</a>
    <header className="topbar"><div className="topbar-inner"><a href="#main-content" className="brand" aria-label="Todo, go to tasks"><span className="brand-mark"><Check size={21} strokeWidth={2.5} /></span>Todo.</a><div className="topbar-actions"><span className="topbar-context">{mode === 'demo' ? 'My daily space' : session?.email || 'Your task list'}</span><button className="icon-button" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button><button className="icon-button help-button" type="button" onClick={() => setHelpOpen(true)} aria-label="How to use Todo"><CircleHelp size={17} /></button>{!session && <div className="header-auth"><button className="text-button" type="button" onClick={openAuth} disabled={busy}>Sign in</button><button className="button primary" type="button" onClick={() => { setAuthMessage(''); navigate('sign-up'); }} disabled={busy}>Sign up</button></div>}{session && <><span className="avatar">{session.email[0].toUpperCase()}</span><button className="icon-button" type="button" onClick={switchToDemo} disabled={busy} aria-label="Sign out"><LogOut size={17} /></button></>}</div></div></header>
    <main id="main-content" className="main-content">
      <section className="intro" aria-labelledby="page-title"><div className="eyebrow"><span />ONE TASK AT A TIME</div><h1 id="page-title">A little progress,<br className="mobile-break" /> every day.</h1><p>A clear space for everything you want to do.</p></section>
     
      {mode === 'backend' && session && <div className="connection-note"><span><span className="mode-dot" />Signed in · Your saved tasks</span><button className="text-button" type="button" onClick={switchToDemo} disabled={busy}>Sign out <LogOut size={14} /></button></div>}
      {mode === 'backend' && !session && <div className="connection-note"><span>Sign in to load your saved tasks.</span><button className="text-button" type="button" onClick={openAuth}><LogIn size={14} />Sign in</button><button className="text-button" type="button" onClick={switchToDemo}>Try demo</button></div>}
      {error && !editingTask && !deleteTarget && <div className="error-banner" role="alert"><AlertCircle size={17} /><span>{error}</span><button className="icon-button" type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
      <form className="quick-add" onSubmit={addTask}><span className="add-icon"><Plus size={19} /></span><label className="sr-only" htmlFor="new-task">New task title</label><input ref={inputRef} id="new-task" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={200} required placeholder="What would you like to get done?" disabled={disabled} /><button className="button primary" type="submit" disabled={disabled || !newTitle.trim()}>{busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}Add task</button></form>
      <div className="list-toolbar"><nav className="filters" aria-label="Filter tasks">{[{ id:'all', label:'All' }, { id:'pending', label:'Pending' }, { id:'completed', label:'Completed' }].map(({ id, label }) => <button type="button" key={id} className={`filter ${filter === id ? 'active' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}<span>{counts[id]}</span></button>)}</nav><div className="list-tools"><label className="search-field"><Search size={15} /><span className="sr-only">Search tasks</span><input type="search" placeholder="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className="icon-button" type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={disabled} aria-label="Refresh tasks"><RefreshCw size={15} className={loading ? 'spin' : ''} /></button></div></div>
      <section className="list-panel" aria-label="Task list">
        {loading ? <div className="empty-state" role="status"><LoaderCircle className="spin" size={25} /><h2>Loading your tasks</h2><p>A fresh look at what’s next.</p></div> : visibleTasks.length ? <ul className="task-list">{visibleTasks.map((task) => <li key={task.id} className={`task-row ${task.isCompleted ? 'is-completed' : ''}`}><label className="task-check-label"><input type="checkbox" className="task-check" checked={task.isCompleted} onChange={() => saveTask({ ...task, isCompleted: !task.isCompleted })} disabled={disabled} aria-label={`${task.isCompleted ? 'Reopen' : 'Complete'} ${task.title}`} /><span className="check-mark"><Check size={13} strokeWidth={3} /></span></label><div className="task-copy"><span className="task-title">{task.title}</span>{task.description && <p className="task-description">{task.description}</p>}</div><div className="row-actions"><button className="icon-button" type="button" onClick={() => { setError(''); setEditingTask(task); }} disabled={disabled} aria-label={`Edit ${task.title}`}><Pencil size={16} /></button><button className="icon-button delete-button" type="button" onClick={() => { setError(''); setDeleteTarget(task); }} disabled={disabled} aria-label={`Delete ${task.title}`}><Trash2 size={16} /></button></div></li>)}</ul> : <div className="empty-state">{search.trim() ? <SearchX size={28} /> : filter === 'completed' ? <CheckCheck size={28} /> : <ClipboardList size={28} />}<h2>{search.trim() ? 'No matching tasks' : filter === 'pending' ? 'A little room to breathe' : filter === 'completed' ? 'Progress starts with one task' : 'A fresh start'}</h2><p>{search.trim() ? 'Try another word or change the filter.' : filter === 'pending' ? 'You’ve completed everything on your list.' : filter === 'completed' ? 'Completed tasks will appear here.' : 'Add your first task whenever you’re ready.'}</p>{!search.trim() && filter === 'all' && <button className="text-button" type="button" onClick={() => inputRef.current?.focus()}>Add a task <ArrowRight size={14} /></button>}</div>}
      </section>
      <div className="list-footer"><span>{counts.completed} of {counts.all} tasks completed</span><div className="progress-summary"><span>{percent}%</span><div className="progress-track" role="progressbar" aria-label="Tasks completed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div style={{ width: `${percent}%` }} /></div></div></div>
      <footer className="page-footer"><span className="footer-rule" /><p>Make room for what matters.</p><span className="footer-rule" /></footer>
    </main>
    <div className="toast-region" role="status" aria-live="polite">{notice && <div className="toast"><Check size={16} />{notice}<button className="icon-button" type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14} /></button></div>}</div>
    <TaskEditDialog task={editingTask} busy={busy} error={error} onClose={() => setEditingTask(null)} onSave={saveTask} />
    <Dialog open={Boolean(deleteTarget)} title="Delete this task?" titleId="delete-heading" onClose={() => { if (!busy) setDeleteTarget(null); }}><p className="dialog-description">“{deleteTarget?.title}” will be removed from {mode === 'demo' ? 'your demo list' : 'the backend'}.</p>{error && <p className="inline-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="button secondary" type="button" disabled={busy} onClick={() => setDeleteTarget(null)}>Keep task</button><button className="button danger" type="button" disabled={busy} onClick={deleteTask}>{busy ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}Delete task</button></div></Dialog>
    <Dialog open={helpOpen} title="A little progress, every day" titleId="help-heading" onClose={() => setHelpOpen(false)}><ol className="help-list"><li>Add a task in the field above your list.</li><li>Tick its checkbox when you’re done.</li><li>Use the pencil to edit or the bin to delete a task.</li><li>Use the filters and search to find what you need.</li><li>Demo mode saves tasks in this browser. Connect your backend to load and save your real tasks.</li></ol><button className="button primary" type="button" onClick={() => setHelpOpen(false)}>Got it</button></Dialog>
  </>;
}
