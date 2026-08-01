# VoiceNotes AI (Electron)

A sleek Windows desktop app built on Electron. Records mic + system audio, transcribes with Gemini AI, generates smart summaries, and lets you chat with every note.

Used by VS Code, Discord, Notion, Slack — Electron is battle-tested for exactly this kind of app.

---

## Features

- **Win+Shift+N** — global hotkey works from any app, any window
- **Floating mini bar** — always-on-top, draggable, lives in the corner
- **Mic + System audio** — captures your voice and app/call audio together
- **AI Transcription** — full transcript via Gemini 1.5 Flash
- **Smart Summary** — structured: overview, key points, decisions, quotes
- **Rewrite** — rephrase with any instruction ("bullet points", "one paragraph", "action items only")
- **Chat** — ask Gemini questions about any specific recording
- **Search** — text search + AI-powered search across all notes
- **System tray** — lives quietly in the tray, always accessible
- **Local storage** — all data stored on your PC (`~/.voicenotes/`)

---

## Quick Start

### 1. Install Node.js
Download from **https://nodejs.org** (LTS version). Check "Add to PATH" during install.

### 2. Run setup
Double-click **`setup.bat`** — installs Electron and all dependencies.

### 3. Get a FREE Gemini API key
Go to **https://aistudio.google.com/app/apikey** → Create API key → Copy it.

### 4. Launch the app
Double-click **`run.bat`**

### 5. Add your API key
Click **⊞** on the floating bar → **⚙ Settings** → paste key → Save.

---

## Recording System Audio (calls, WhatsApp, Zoom, etc.)

By default only your microphone is captured. For system audio:

**Option A — Stereo Mix (free, built into Windows)**
1. Right-click speaker in taskbar → Sound Settings → More sound settings
2. Go to **Recording** tab
3. Right-click empty space → **Show Disabled Devices**
4. Right-click **Stereo Mix** → **Enable**
5. Restart VoiceNotes AI

**Option B — VB-Cable (free, more reliable)**
1. Download from **https://vb-audio.com/Cable/**
2. Install, reboot
3. Set "CABLE Input" as default Windows playback device
4. VoiceNotes automatically picks it up

---

## Hotkey

Default: **Win+Shift+N** — press once to start recording, again to stop.

Change it: Settings → Hotkey field. Supported formats:
- `CommandOrControl+Shift+N`
- `CommandOrControl+Alt+Space`
- `F9`

Restart the app after changing the hotkey.

---

## File Locations

| What | Where |
|------|-------|
| Database | `%USERPROFILE%\.voicenotes\voicenotes.db` |
| Audio files | `%USERPROFILE%\.voicenotes\audio\` |
| Config | `%USERPROFILE%\.voicenotes\config.json` |

---

## Troubleshooting

**"Cannot find module" on startup**
→ Run `setup.bat` again. If it still fails, open a terminal in the app folder and run `npm install` then `npx electron-rebuild`.

**Mic permission denied**
→ Windows Settings → Privacy & Security → Microphone → Allow desktop apps

**System audio not captured**
→ Follow the Stereo Mix or VB-Cable steps above

**Gemini error 403 / invalid key**
→ Make sure your key starts with "AIza" and has no extra spaces. Regenerate at aistudio.google.com if needed.

**Hotkey not working**
→ Try a different combo in Settings. Some hotkeys conflict with Windows or other apps.
