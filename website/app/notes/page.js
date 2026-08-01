import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Your Notes — VoiceNotes AI' };

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, title, summary, status, created_at, duration')
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 p-6">
      <h1 className="mb-4 text-xl font-bold">Your Notes</h1>

      {error && (
        <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg2)] p-6 text-center text-[var(--color-text2)]">
          Failed to load notes: {error.message}
        </div>
      )}

      {!error && (!notes || notes.length === 0) && (
        <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg2)] p-10 text-center text-[var(--color-text2)]">
          No notes yet. Record something in the desktop app and it&apos;ll show up here.
        </div>
      )}

      {!error && notes && notes.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {notes.map((n) => (
            <a
              key={n.id}
              href={`/notes/${n.id}`}
              className="block rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg2)] p-4 transition-colors hover:border-[var(--color-border2)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{n.title || 'Untitled'}</span>
                <span className="whitespace-nowrap text-xs text-[var(--color-text3)]">{formatDate(n.created_at)}</span>
              </div>
              <div className="mt-1.5 line-clamp-2 text-sm text-[var(--color-text2)]">
                {n.summary || (n.status === 'processing' ? 'Processing...' : 'No summary')}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
