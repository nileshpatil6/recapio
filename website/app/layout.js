import "./globals.css";

export const metadata = {
  title: "VoiceNotes AI",
  description: "AI-powered voice notes — record, transcribe, summarize, chat",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
