const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const config = require('./src/config');
const db = require('./src/store');
const gemini = require('./src/gemini');
const supabaseClient = require('./src/supabaseClient');

let floatingBar = null;
let mainWindow = null;
let tray = null;
let isRecording = false;
let currentHotkey = null;

// ─────────────────────────────────────────────
// App Init
// ─────────────────────────────────────────────
app.whenReady().then(() => {
  db.init();
  const apiKey = config.get('geminiApiKey');
  if (apiKey) gemini.configure(apiKey);
  supabaseClient.configure();

  createFloatingBar();
  createTray();
  registerHotkey();

  app.on('activate', () => { if (!floatingBar) createFloatingBar(); });
});

app.on('window-all-closed', (e) => e.preventDefault());

app.on('will-quit', () => {
  if (currentHotkey) globalShortcut.unregisterAll();
});

// ─────────────────────────────────────────────
// Floating Bar Window
// ─────────────────────────────────────────────
function createFloatingBar() {
  const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;

  floatingBar = new BrowserWindow({
    width: 290,
    height: 76,
    x: width - 308,
    y: height - 90,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  floatingBar.loadFile(path.join(__dirname, 'renderer/bar/index.html'));
  floatingBar.setAlwaysOnTop(true, 'screen-saver');
  floatingBar.on('closed', () => { floatingBar = null; });
}

// ─────────────────────────────────────────────
// Main App Window
// ─────────────────────────────────────────────
function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f1a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/app/index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─────────────────────────────────────────────
// System Tray
// ─────────────────────────────────────────────
function createTray() {
  // Create a simple 16x16 icon programmatically if no icon file
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) throw new Error('empty');
  } catch {
    icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAA' +
      'UklEQVQ4jWNgGAWjgP///w8AAggAAaXKiukAAAAASUVORK5CYII='
    );
  }

  tray = new Tray(icon);
  tray.setToolTip('VoiceNotes AI');
  updateTrayMenu();
  tray.on('double-click', openMainWindow);
}

function updateTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: 'VoiceNotes AI', enabled: false },
    { type: 'separator' },
    { label: isRecording ? '⏹  Stop Recording' : '⏺  Start Recording', click: toggleRecording },
    { label: '📋  Open Notes', click: openMainWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => app.exit(0) },
  ]);
  tray.setContextMenu(menu);
}

// ─────────────────────────────────────────────
// Global Hotkey
// ─────────────────────────────────────────────
function registerHotkey() {
  if (currentHotkey) globalShortcut.unregister(currentHotkey);
  const hotkey = config.get('hotkey') || 'CommandOrControl+Shift+N';
  try {
    const ok = globalShortcut.register(hotkey, toggleRecording);
    if (!ok) console.warn('[Hotkey] Registration failed for:', hotkey);
    else { currentHotkey = hotkey; console.log('[Hotkey] Registered:', hotkey); }
  } catch (e) {
    console.error('[Hotkey] Error:', e.message);
  }
}

// ─────────────────────────────────────────────
// Recording flow
// ─────────────────────────────────────────────
function toggleRecording() {
  if (isRecording) {
    floatingBar?.webContents.send('stop-recording');
  } else {
    isRecording = true;
    updateTrayMenu();
    floatingBar?.webContents.send('start-recording');
  }
}

function openMainWindow() {
  createMainWindow();
}

// ─────────────────────────────────────────────
// IPC Handlers
// ─────────────────────────────────────────────

// Recording done — audio blob arrives from renderer
ipcMain.handle('recording-done', async (_e, { audioBuffer, duration }) => {
  isRecording = false;
  updateTrayMenu();

  if (!audioBuffer || audioBuffer.byteLength === 0) {
    floatingBar?.webContents.send('status', 'Nothing recorded');
    setTimeout(() => floatingBar?.webContents.send('status', 'ready'), 2500);
    return;
  }

  floatingBar?.webContents.send('status', 'processing');

  // Save audio file
  const audioDir = db.getAudioDir();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const audioPath = path.join(audioDir, `recording_${ts}.webm`);
  fs.writeFileSync(audioPath, Buffer.from(audioBuffer));

  const noteId = await db.createNote({ audioPath, duration });

  // Notify main window
  mainWindow?.webContents.send('notes-updated');

  // Process async
  processRecording(noteId, audioPath).catch(console.error);
  return noteId;
});

async function processRecording(noteId, audioPath) {
  if (!gemini.isConfigured()) {
    await db.updateNote(noteId, {
      transcript: '(No API key set)',
      summary: 'Open Settings and add your Gemini API key to enable transcription.',
      status: 'done',
    });
    floatingBar?.webContents.send('status', 'done-nokey');
    mainWindow?.webContents.send('notes-updated');
    return;
  }

  try {
    const { transcript, summary } = await gemini.transcribeAndSummarize(audioPath);
    await db.updateNote(noteId, { transcript, summary, status: 'done' });
    floatingBar?.webContents.send('status', 'done');
    mainWindow?.webContents.send('notes-updated');
    mainWindow?.webContents.send('note-ready', noteId);
  } catch (err) {
    console.error('[Process]', err);
    await db.updateNote(noteId, {
      transcript: '',
      summary: `Error: ${err.message}`,
      status: 'error',
    });
    floatingBar?.webContents.send('status', 'error');
    mainWindow?.webContents.send('notes-updated');
  }
}

ipcMain.handle('open-main', () => openMainWindow());

// Window controls
ipcMain.handle('minimize-window', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.handle('maximize-window', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win?.isMaximized()) win.unmaximize(); else win?.maximize();
});
ipcMain.handle('close-window', (e) => BrowserWindow.fromWebContents(e.sender)?.hide());

// Config
ipcMain.handle('get-config', () => {
  const cfg = config.all();
  delete cfg.supabaseSession; // never expose tokens to the renderer
  return cfg;
});
ipcMain.handle('save-config', (_e, cfg) => {
  config.setAll(cfg);
  if (cfg.geminiApiKey) gemini.configure(cfg.geminiApiKey);
  if (cfg.hotkey) registerHotkey();
  if (cfg.supabaseUrl || cfg.supabaseAnonKey) supabaseClient.configure();
  return { ok: true };
});

// Auth
ipcMain.handle('auth-sign-up', async (_e, { email, password }) => {
  const { user } = await supabaseClient.signUp(email, password);
  mainWindow?.webContents.send('notes-updated');
  return { email: user?.email || email };
});
ipcMain.handle('auth-sign-in', async (_e, { email, password }) => {
  const { user } = await supabaseClient.signIn(email, password);
  mainWindow?.webContents.send('notes-updated');
  return { email: user?.email || email };
});
ipcMain.handle('auth-sign-out', async () => {
  await supabaseClient.signOut();
  mainWindow?.webContents.send('notes-updated');
  return { ok: true };
});
ipcMain.handle('auth-status', async () => {
  const user = await supabaseClient.getCurrentUser();
  return { configured: supabaseClient.isConfigured(), email: user?.email || null };
});

// Notes
ipcMain.handle('get-notes', () => db.getAllNotes());
ipcMain.handle('get-note', (_e, id) => db.getNote(id));
ipcMain.handle('search-notes', (_e, q) => db.searchNotes(q));
ipcMain.handle('update-note', async (_e, { id, fields }) => { await db.updateNote(id, fields); return db.getNote(id); });
ipcMain.handle('delete-note', async (_e, id) => { await db.deleteNote(id); return { ok: true }; });

// Chat
ipcMain.handle('get-chat', (_e, noteId) => db.getChatMessages(noteId));
ipcMain.handle('clear-chat', async (_e, noteId) => { await db.clearChat(noteId); return { ok: true }; });
ipcMain.handle('send-chat', async (_e, { noteId, userMessage, transcript, summary }) => {
  await db.addChatMessage({ noteId, role: 'user', content: userMessage });
  const history = (await db.getChatMessages(noteId)).slice(0, -1);
  const reply = await gemini.chat(transcript, summary, history, userMessage);
  await db.addChatMessage({ noteId, role: 'assistant', content: reply });
  return reply;
});

// Rewrite
ipcMain.handle('rewrite', async (_e, { transcript, instruction }) => {
  return await gemini.rewriteSummary(transcript, instruction);
});

// Global search
ipcMain.handle('global-search', async (_e, query) => {
  const notes = db.getAllNotes();
  return await gemini.searchAcrossNotes(notes, query);
});

// Open audio file in explorer
ipcMain.handle('show-audio', (_e, audioPath) => {
  if (audioPath && fs.existsSync(audioPath)) shell.showItemInFolder(audioPath);
});

// Desktop sources for system audio capture
ipcMain.handle('get-desktop-sources', async () => {
  const { desktopCapturer } = require('electron');
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  return sources.map(s => ({ id: s.id, name: s.name }));
});
