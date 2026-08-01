export default function AuthLayout({ children }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-14 items-center border-b border-[var(--color-border)] bg-[var(--color-bg2)] px-6">
        <span className="font-bold tracking-wide text-[var(--color-accent)]">🎙 VoiceNotes AI</span>
      </div>
      {children}
    </div>
  );
}
