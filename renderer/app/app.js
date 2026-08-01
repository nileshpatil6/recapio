// Main app renderer
let notes = [];
let currentNoteId = null;
let activeTab = 'summary';

// ── Init ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setupWindowControls();
  setupSidebar();
  setupModals();
  setupAuth();
  await loadNotes();

  window.api.on('notes-updated', async () => { await loadNotes(); });
  window.api.on('note-ready', (_e, noteId) => {
    if (currentNoteId === noteId) openNote(noteId);
  });
});

// ── Window controls ──────────────────────────────────
function setupWindowControls() {
  document.getElementById('btnMin').addEventListener('click', () => window.api.minimize());
  document.getElementById('btnMax').addEventListener('click', () => window.api.maximize());
  document.getElementById('btnClose').addEventListener('click', () => window.api.close());
}

// ── Sidebar ──────────────────────────────────────────
function setupSidebar() {
  const search = document.getElementById('searchInput');
  search.addEventListener('input', async () => {
    const q = search.value.trim();
    if (q) {
      const results = await window.api.searchNotes(q);
      renderNotesList(results);
    } else {
      await loadNotes();
    }
  });

  document.getElementById('aiSearchBtn').addEventListener('click', () => {
    document.getElementById('aiModal').classList.remove('hidden');
    document.getElementById('aiQuery').focus();
  });
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
}

async function loadNotes() {
  notes = await window.api.getNotes();
  renderNotesList(notes);
}

function renderNotesList(list) {
  const el = document.getElementById('notesList');
  if (!list.length) {
    el.innerHTML = '<div class="empty-list">No recordings yet.<br/>Press Win+Shift+N to start.</div>';
    return;
  }
  el.innerHTML = list.map(n => noteCardHTML(n)).join('');
  el.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => openNote(Number(card.dataset.id)));
  });
}

function noteCardHTML(n) {
  const status = n.status || 'processing';
  const dotColor = status === 'done' ? '#7b7fff' : status === 'error' ? '#ff5555' : '#ffaa44';
  const dur = formatDuration(n.duration || 0);
  const date = formatDate(n.created_at);
  const selected = n.id === currentNoteId ? ' selected' : '';
  return `<div class="note-card${selected}" data-id="${n.id}">
    <div class="note-card-top">
      <span class="note-status-dot" style="color:${dotColor}">●</span>
      <span class="note-dur">${dur}</span>
    </div>
    <div class="note-title">${esc(n.title || 'Untitled')}</div>
    <div class="note-date">${esc(date)}</div>
  </div>`;
}

// ── Note detail ──────────────────────────────────────
async function openNote(noteId) {
  currentNoteId = noteId;
  const note = await window.api.getNote(noteId);
  if (!note) return;

  renderNotesList(notes); // re-render to update selection
  renderNote(note);
}

function renderNote(note) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="note-header">
      <input class="note-title-input" id="titleInput" value="${esc(note.title || 'Untitled')}" />
      <span class="note-meta">${formatDate(note.created_at)} · ${formatDuration(note.duration || 0)}</span>
      <div class="header-actions">
        <button class="icon-btn" id="showAudioBtn" title="Show audio file">📂</button>
        <button class="icon-btn danger" id="deleteBtn" title="Delete note">🗑</button>
      </div>
    </div>

    <div class="tabs-bar">
      <button class="tab-btn ${activeTab === 'summary' ? 'active' : ''}" data-tab="summary">Summary</button>
      <button class="tab-btn ${activeTab === 'transcript' ? 'active' : ''}" data-tab="transcript">Transcript</button>
      <button class="tab-btn ${activeTab === 'chat' ? 'active' : ''}" data-tab="chat">Chat</button>
    </div>

    <div class="tab-panel ${activeTab === 'summary' ? 'active' : ''}" id="tab-summary"></div>
    <div class="tab-panel ${activeTab === 'transcript' ? 'active' : ''}" id="tab-transcript"></div>
    <div class="tab-panel ${activeTab === 'chat' ? 'active' : ''}" id="tab-chat"></div>
  `;

  // Tab switching
  content.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      content.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      content.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${activeTab}`));
    });
  });

  // Title save
  const titleInput = document.getElementById('titleInput');
  const saveTitle = () => window.api.updateNote(note.id, { title: titleInput.value });
  titleInput.addEventListener('blur', saveTitle);
  titleInput.addEventListener('keydown', e => { if (e.key === 'Enter') titleInput.blur(); });

  // Delete
  document.getElementById('deleteBtn').addEventListener('click', () => deleteNote(note));

  // Show audio
  document.getElementById('showAudioBtn').addEventListener('click', () => window.api.showAudio(note.audio_path));

  renderSummaryTab(note);
  renderTranscriptTab(note);
  renderChatTab(note);
}

// ── Summary tab ──────────────────────────────────────
function renderSummaryTab(note) {
  const panel = document.getElementById('tab-summary');
  const status = note.status || 'processing';

  if (status === 'processing') {
    panel.innerHTML = `<div class="processing-card">
      <div class="spinner"></div>
      <div class="processing-title">Processing your recording...</div>
      <div class="processing-sub">Transcribing and summarizing with Gemini AI</div>
    </div>`;
    setTimeout(() => refreshNoteIfOpen(note.id), 3500);
    return;
  }

  panel.innerHTML = `
    <div class="rewrite-bar">
      <span class="rewrite-label">Rewrite:</span>
      <input class="rewrite-input" id="rewriteInput" placeholder='e.g. "as bullet points" · "focus on action items" · "in one paragraph"' />
      <button class="btn-primary" id="rewriteBtn">Go</button>
    </div>
    <div class="textbox" id="summaryBox">${mdToHtml(note.summary || 'No summary available.')}</div>
    <div class="note-footer">Duration: ${formatDuration(note.duration || 0)}</div>
  `;

  document.getElementById('rewriteBtn').addEventListener('click', async () => {
    const instr = document.getElementById('rewriteInput').value.trim();
    if (!instr) return;
    const btn = document.getElementById('rewriteBtn');
    btn.disabled = true; btn.textContent = '...';
    try {
      const newSummary = await window.api.rewrite(note.transcript || '', instr);
      await window.api.updateNote(note.id, { summary: newSummary });
      note.summary = newSummary;
      document.getElementById('summaryBox').innerHTML = mdToHtml(newSummary);
    } catch (e) {
      alert('Rewrite failed: ' + e.message);
    }
    btn.disabled = false; btn.textContent = 'Go';
  });

  document.getElementById('rewriteInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('rewriteBtn').click();
  });
}

// ── Transcript tab ───────────────────────────────────
function renderTranscriptTab(note) {
  const panel = document.getElementById('tab-transcript');
  const status = note.status || 'processing';
  if (status === 'processing') {
    panel.innerHTML = `<div class="processing-card"><div class="spinner"></div><div class="processing-title">Processing...</div></div>`;
    return;
  }
  panel.innerHTML = `<div class="textbox">${esc(note.transcript || 'No transcript available.')}</div>`;
}

// ── Chat tab ─────────────────────────────────────────
async function renderChatTab(note) {
  const panel = document.getElementById('tab-chat');
  panel.innerHTML = `
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-area">
      <input class="chat-input" id="chatInput" placeholder="Ask anything about this recording..." />
      <button class="btn-primary" id="chatSend">Send</button>
      <button class="btn-ghost" id="chatClear">Clear</button>
    </div>
  `;

  const msgs = await window.api.getChat(note.id);
  msgs.forEach(m => appendBubble(m.role, m.content));

  document.getElementById('chatSend').addEventListener('click', () => sendChat(note));
  document.getElementById('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(note); });
  document.getElementById('chatClear').addEventListener('click', async () => {
    await window.api.clearChat(note.id);
    document.getElementById('chatMessages').innerHTML = '';
  });
}

async function sendChat(note) {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  appendBubble('user', msg);

  const thinking = appendBubble('assistant', 'Thinking...', true);
  const sendBtn = document.getElementById('chatSend');
  sendBtn.disabled = true;

  try {
    const reply = await window.api.sendChat(note.id, msg, note.transcript || '', note.summary || '');
    thinking.querySelector('.bubble').classList.remove('thinking');
    thinking.querySelector('.bubble').innerHTML = mdToHtml(reply);
  } catch (e) {
    thinking.querySelector('.bubble').classList.remove('thinking');
    thinking.querySelector('.bubble').textContent = 'Error: ' + e.message;
  }
  sendBtn.disabled = false;
}

function appendBubble(role, content, isThinking = false) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return null;
  const isUser = role === 'user';
  const wrap = document.createElement('div');
  wrap.className = `bubble-wrap ${isUser ? 'user' : ''}`;
  wrap.innerHTML = `
    <div class="bubble-role">${isUser ? 'You' : 'Gemini'}</div>
    <div class="bubble ${isUser ? 'user' : 'assistant'} ${isThinking ? 'thinking' : ''}">${isThinking ? content : (isUser ? esc(content) : mdToHtml(content))}</div>
  `;
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
  return wrap;
}

// ── Delete ───────────────────────────────────────────
async function deleteNote(note) {
  if (!confirm(`Delete "${note.title}"? This cannot be undone.`)) return;
  await window.api.deleteNote(note.id);
  currentNoteId = null;
  await loadNotes();
  document.getElementById('content').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🗑</div>
      <div class="empty-title">Note deleted</div>
    </div>`;
}

// ── Settings modal ───────────────────────────────────
async function openSettings() {
  const cfg = await window.api.getConfig();
  document.getElementById('apiKeyInput').value = cfg.geminiApiKey || '';
  document.getElementById('hotkeyInput').value = cfg.hotkey || 'CommandOrControl+Shift+N';
  document.getElementById('chkMic').checked = cfg.recordMic !== false;
  document.getElementById('chkSystem').checked = cfg.recordSystem !== false;
  document.getElementById('supabaseUrlInput').value = cfg.supabaseUrl || '';
  document.getElementById('supabaseKeyInput').value = cfg.supabaseAnonKey || '';
  document.getElementById('settingsModal').classList.remove('hidden');
  await refreshAuthUI();
}

async function refreshAuthUI() {
  const status = await window.api.authStatus();
  document.getElementById('authError').textContent = '';
  if (status.email) {
    document.getElementById('authLoggedOut').classList.add('hidden');
    document.getElementById('authLoggedIn').classList.remove('hidden');
    document.getElementById('authEmailLabel').textContent = status.email;
  } else {
    document.getElementById('authLoggedOut').classList.remove('hidden');
    document.getElementById('authLoggedIn').classList.add('hidden');
  }
}

function setupAuth() {
  document.getElementById('authSignInBtn').addEventListener('click', () => doAuth('signIn'));
  document.getElementById('authSignUpBtn').addEventListener('click', () => doAuth('signUp'));
  document.getElementById('authSignOutBtn').addEventListener('click', async () => {
    await window.api.signOut();
    await refreshAuthUI();
    await loadNotes();
  });
}

async function doAuth(mode) {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Enter email and password.'; return; }

  // Persist Supabase connection details first so sign-in/up can use them.
  await window.api.saveConfig({
    supabaseUrl: document.getElementById('supabaseUrlInput').value.trim(),
    supabaseAnonKey: document.getElementById('supabaseKeyInput').value.trim(),
  });

  try {
    if (mode === 'signUp') {
      await window.api.signUp(email, password);
      errEl.style.color = 'var(--green)';
      errEl.textContent = 'Account created. If email confirmation is required, check your inbox, then log in.';
    } else {
      await window.api.signIn(email, password);
      await refreshAuthUI();
      await loadNotes();
    }
  } catch (e) {
    errEl.style.color = 'var(--red)';
    errEl.textContent = e.message || 'Authentication failed.';
  }
}

function setupModals() {
  document.getElementById('settingsClose').addEventListener('click', () =>
    document.getElementById('settingsModal').classList.add('hidden'));
  document.getElementById('settingsCancel').addEventListener('click', () =>
    document.getElementById('settingsModal').classList.add('hidden'));
  document.getElementById('settingsSave').addEventListener('click', async () => {
    await window.api.saveConfig({
      geminiApiKey: document.getElementById('apiKeyInput').value.trim(),
      hotkey: document.getElementById('hotkeyInput').value.trim(),
      recordMic: document.getElementById('chkMic').checked,
      recordSystem: document.getElementById('chkSystem').checked,
      supabaseUrl: document.getElementById('supabaseUrlInput').value.trim(),
      supabaseAnonKey: document.getElementById('supabaseKeyInput').value.trim(),
    });
    document.getElementById('settingsModal').classList.add('hidden');
  });

  document.getElementById('getKeyLink').addEventListener('click', e => {
    e.preventDefault();
    require('electron').shell?.openExternal('https://aistudio.google.com/app/apikey');
  });

  // AI search modal
  document.getElementById('aiClose').addEventListener('click', () =>
    document.getElementById('aiModal').classList.add('hidden'));
  document.getElementById('aiAsk').addEventListener('click', doAiSearch);
  document.getElementById('aiQuery').addEventListener('keydown', e => { if (e.key === 'Enter') doAiSearch(); });

  // Close modal on backdrop click
  ['settingsModal', 'aiModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target.id === id) document.getElementById(id).classList.add('hidden');
    });
  });
}

async function doAiSearch() {
  const query = document.getElementById('aiQuery').value.trim();
  if (!query) return;
  const result = document.getElementById('aiResult');
  const btn = document.getElementById('aiAsk');
  result.textContent = 'Searching across all your notes...';
  btn.disabled = true;
  try {
    const answer = await window.api.globalSearch(query);
    result.innerHTML = mdToHtml(answer);
  } catch (e) {
    result.textContent = 'Error: ' + e.message;
  }
  btn.disabled = false;
}

// ── Helpers ──────────────────────────────────────────
async function refreshNoteIfOpen(noteId) {
  if (currentNoteId !== noteId) return;
  const note = await window.api.getNote(noteId);
  if (!note) return;
  if (note.status === 'processing') { setTimeout(() => refreshNoteIfOpen(noteId), 3500); return; }
  renderNote(note);
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function mdToHtml(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
    .replace(/^[•\-] (.+)$/gm, '&nbsp;&nbsp;• $1')
    .replace(/\n/g, '<br/>');
}
