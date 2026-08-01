import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NoteTabs from './tabs';

function formatDuration(secs) {
  const m = Math.floor((secs || 0) / 60), s = Math.floor((secs || 0) % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default async function NoteDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: note } = await supabase.from('notes').select('*').eq('id', id).maybeSingle();
  if (!note) notFound();

  const { data: chat } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('note_id', id)
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 p-6">
      <h1 className="text-xl font-bold">{note.title || 'Untitled'}</h1>
      <div className="mb-5 mt-1 text-sm text-[var(--color-text3)]">
        {formatDate(note.created_at)} · {formatDuration(note.duration)}
      </div>

      <NoteTabs
        summary={note.status === 'processing' ? 'Still processing...' : note.summary}
        transcript={note.transcript}
        chat={chat || []}
      />
    </div>
  );
}
