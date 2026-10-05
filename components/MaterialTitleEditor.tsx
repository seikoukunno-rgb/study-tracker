'use client';

import { useRef, useState } from 'react';
import { Check, Edit2, Loader2, X } from 'lucide-react';

type Props = { title: string; onRename: (title: string) => Promise<void>; dark?: boolean };

export default function MaterialTitleEditor({ title, onRename, dark = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    if (!value.trim()) { setError('教材名を入力してください。'); return; }
    pending.current = true;
    setSaving(true);
    setError(null);
    try { await onRename(value.trim()); setEditing(false); }
    catch (error) { setError(error instanceof Error ? error.message : '教材名を保存できませんでした。'); }
    finally { pending.current = false; setSaving(false); }
  };
  return <div className="w-full min-w-0">
    {editing ? <form onSubmit={submit} className="flex items-center gap-2">
      <input autoFocus aria-label="教材名" value={value} disabled={saving}
        onChange={event => setValue(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
          if (event.key === 'Escape' && !saving) setEditing(false);
        }}
        className={`min-w-0 flex-1 border border-indigo-500 rounded-lg px-3 py-2 text-sm font-bold outline-none ${dark ? 'bg-black/40 text-white' : 'bg-white text-slate-800'}`} />
      <button type="submit" aria-label="教材名を保存" disabled={saving} className="p-2 bg-indigo-600 rounded-lg text-white disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button type="button" aria-label="教材名の編集をキャンセル" disabled={saving} onClick={() => setEditing(false)} className={`p-2 rounded-lg ${dark ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-500'}`}><X className="w-4 h-4" /></button>
    </form> : <button type="button" aria-label={`教材名「${title}」を編集`} onClick={() => { setValue(title); setError(null); setEditing(true); }}
      className={`group flex items-center gap-2 w-full text-left font-bold ${dark ? 'text-white/70' : 'text-slate-800'}`}>
      <span className="text-sm flex-1 min-w-0 break-words">{title}</span><Edit2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
    </button>}
    {editing && error && <p role="alert" className="mt-2 text-xs text-rose-500">{error}</p>}
  </div>;
}
