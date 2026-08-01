const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window'),

  // Recording
  recordingDone: (audioBuffer, duration) => ipcRenderer.invoke('recording-done', { audioBuffer, duration }),
  openMain: () => ipcRenderer.invoke('open-main'),

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),

  // Auth
  signUp: (email, password) => ipcRenderer.invoke('auth-sign-up', { email, password }),
  signIn: (email, password) => ipcRenderer.invoke('auth-sign-in', { email, password }),
  signOut: () => ipcRenderer.invoke('auth-sign-out'),
  authStatus: () => ipcRenderer.invoke('auth-status'),

  // Notes
  getNotes: () => ipcRenderer.invoke('get-notes'),
  getNote: (id) => ipcRenderer.invoke('get-note', id),
  searchNotes: (q) => ipcRenderer.invoke('search-notes', q),
  updateNote: (id, fields) => ipcRenderer.invoke('update-note', { id, fields }),
  deleteNote: (id) => ipcRenderer.invoke('delete-note', id),

  // Chat
  getChat: (noteId) => ipcRenderer.invoke('get-chat', noteId),
  sendChat: (noteId, userMessage, transcript, summary) =>
    ipcRenderer.invoke('send-chat', { noteId, userMessage, transcript, summary }),
  clearChat: (noteId) => ipcRenderer.invoke('clear-chat', noteId),

  // AI
  rewrite: (transcript, instruction) => ipcRenderer.invoke('rewrite', { transcript, instruction }),
  globalSearch: (query) => ipcRenderer.invoke('global-search', query),

  // Misc
  showAudio: (audioPath) => ipcRenderer.invoke('show-audio', audioPath),
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),

  // Events
  on: (channel, fn) => {
    const allowed = ['start-recording', 'stop-recording', 'status', 'notes-updated', 'note-ready'];
    if (allowed.includes(channel)) ipcRenderer.on(channel, fn);
  },
  off: (channel, fn) => ipcRenderer.removeListener(channel, fn),
});
