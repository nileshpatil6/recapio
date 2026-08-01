'use client';

import { useState } from 'react';

export default function NoteTabs({ summary, transcript, chat }) {
  const [tab, setTab] = useState('summary');

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'chat', label: 'Chat' },
  ];

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-[var(--color-border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3.5 py-2 text-sm ${
              tab === t.id
                ? 'border-[var(--color-accent)] text-[var(--color-text)]'
                : 'border-transparent text-[var(--color-text2)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && <div className="textbox">{summary || 'No summary available.'}</div>}
      {tab === 'transcript' && <div className="textbox">{transcript || 'No transcript available.'}</div>}
      {tab === 'chat' && (
        <div className="flex flex-col gap-3">
          {chat.length === 0 && (
            <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg2)] p-8 text-center text-[var(--color-text2)]">
              No chat messages for this note.
            </div>
          )}
          {chat.map((m) => (
            <div key={m.id}>
              <div className="mb-1 text-xs text-[var(--color-text3)]">{m.role === 'user' ? 'You' : 'Gemini'}</div>
              <div className="inline-block max-w-[90%] rounded-lg bg-[var(--color-bg3)] px-3 py-2.5 text-sm leading-relaxed">
                {m.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
