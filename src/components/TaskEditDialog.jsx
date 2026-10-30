import { useEffect, useState } from 'react';
import { LoaderCircle, Save } from 'lucide-react';
import Dialog from './Dialog.jsx';

export default function TaskEditDialog({ task, busy, error, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    setTitle(task?.title || ''); setDescription(task?.description || ''); setCompleted(Boolean(task?.isCompleted));
  }, [task]);
  async function submit(event) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    if (await onSave({ ...task, title: title.trim(), description: description.trim(), isCompleted: completed })) onClose();
  }
  return <Dialog open={Boolean(task)} title="Edit your task" titleId="edit-heading" onClose={() => { if (!busy) onClose(); }}>
    <p className="dialog-description">A clear next step makes all the difference.</p>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="edit-title">Task title</label><input id="edit-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required disabled={busy} />
      <label className="field-label" htmlFor="edit-description">Description</label><textarea id="edit-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={255} rows={4} disabled={busy} placeholder="Add a little more detail…" /><p className="character-count">{description.length}/255</p>
      <label className="completed-field"><input type="checkbox" checked={completed} onChange={(event) => setCompleted(event.target.checked)} disabled={busy} />Completed</label>
      <div className="dialog-actions"><button className="button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="button primary" type="submit" disabled={busy || !title.trim()}>{busy ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}Save changes</button></div>
    </form>
  </Dialog>;
}
