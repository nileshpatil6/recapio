import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function NotesLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  async function signOut() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg2)] px-6">
        <a href="/notes" className="font-bold tracking-wide text-[var(--color-accent)]">🎙 VoiceNotes AI</a>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-text2)]">{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="btn-secondary">Log Out</button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
