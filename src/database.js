/**
 * Pure JSON-based database — no native modules, no compilation needed.
 * Stores notes and chat messages as JSON files in ~/.voicenotes/
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.voicenotes');
const AUDIO_DIR = path.join(DATA_DIR, 'audio');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');

let _notes = [];
let _chats = [];
let _nextNoteId = 1;
let _nextChatId = 1;

// ─── Init ────────────────────────────────────────────
function init() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  _loadNotes();
  _loadChats();
}

function _loadNotes() {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      const data = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
      _notes = data.notes || [];
      _nextNoteId = data.nextId || (_notes.length ? Math.max(..._notes.map(n => n.id)) + 1 : 1);
    }
  } catch { _notes = []; _nextNoteId = 1; }
}

function _loadChats() {
  try {
    if (fs.existsSync(CHATS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
      _chats = data.chats || [];
      _nextChatId = data.nextId || (_chats.length ? Math.max(..._chats.map(c => c.id)) + 1 : 1);
    }
  } catch { _chats = []; _nextChatId = 1; }
}

function _saveNotes() {
  fs.writeFileSync(NOTES_FILE, JSON.stringify({ notes: _notes, nextId: _nextNoteId }, null, 2));
}

function _saveChats() {
  fs.writeFileSync(CHATS_FILE, JSON.stringify({ chats: _chats, nextId: _nextChatId }, null, 2));
}

// ─── Notes ───────────────────────────────────────────
function createNote({ audioPath, duration }) {
  const now = new Date().toISOString();
  const d = new Date();
  const title = `Recording ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  const note = {
    id: _nextNoteId++,
    title,
    created_at: now,
    duration: duration || 0,
    audio_path: audioPath || '',
    transcript: '',
    summary: '',
    status: 'processing',
  };
  _notes.push(note);
  _saveNotes();
  return note.id;
}

function updateNote(id, fields) {
  const idx = _notes.findIndex(n => n.id === id);
  if (idx === -1) return;
  Object.assign(_notes[idx], fields);
  _saveNotes();
}

function getNote(id) {
  return _notes.find(n => n.id === id) || null;
}

function getAllNotes() {
  return [..._notes].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function searchNotes(query) {
  const q = query.toLowerCase();
  return [..._notes]
    .filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.transcript || '').toLowerCase().includes(q) ||
      (n.summary || '').toLowerCase().includes(q)
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function deleteNote(id) {
  _notes = _notes.filter(n => n.id !== id);
  _chats = _chats.filter(c => c.note_id !== id);
  _saveNotes();
  _saveChats();
}

// ─── Chat ────────────────────────────────────────────
function addChatMessage({ noteId, role, content }) {
  const msg = {
    id: _nextChatId++,
    note_id: noteId,
    role,
    content,
    created_at: new Date().toISOString(),
  };
  _chats.push(msg);
  _saveChats();
}

function getChatMessages(noteId) {
  return _chats
    .filter(c => c.note_id === noteId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function clearChat(noteId) {
  _chats = _chats.filter(c => c.note_id !== noteId);
  _saveChats();
}

function getAudioDir() { return AUDIO_DIR; }

module.exports = {
  init, createNote, updateNote, getNote, getAllNotes,
  searchNotes, deleteNote, addChatMessage, getChatMessages, clearChat, getAudioDir,
};
