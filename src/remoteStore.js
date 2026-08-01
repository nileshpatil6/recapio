/**
 * Supabase-backed note/chat store. Mirrors database.js's function names,
 * but async and scoped to the signed-in user via RLS.
 */
const { getClient, getCurrentUser } = require('./supabaseClient');

async function _client() {
  const c = getClient();
  if (!c) throw new Error('Supabase is not configured.');
  return c;
}

function _mapNote(row) {
  return {
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    duration: row.duration,
    audio_path: row.audio_path || '',
    transcript: row.transcript,
    summary: row.summary,
    status: row.status,
  };
}

async function createNote({ audioPath, duration }) {
  const c = await _client();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in.');

  const d = new Date();
  const title = `Recording ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  const { data, error } = await c
    .from('notes')
    .insert({ user_id: user.id, title, duration: duration || 0, status: 'processing' })
    .select()
    .single();
  if (error) throw error;

  // audio_path is local-only metadata; not stored server-side, kept in-memory via caller
  data.audio_path = audioPath || '';
  return data.id;
}

async function updateNote(id, fields) {
  const c = await _client();
  const patch = {};
  if ('title' in fields) patch.title = fields.title;
  if ('transcript' in fields) patch.transcript = fields.transcript;
  if ('summary' in fields) patch.summary = fields.summary;
  if ('status' in fields) patch.status = fields.status;
  if ('duration' in fields) patch.duration = fields.duration;
  const { error } = await c.from('notes').update(patch).eq('id', id);
  if (error) throw error;
}

async function getNote(id) {
  const c = await _client();
  const { data, error } = await c.from('notes').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? _mapNote(data) : null;
}

async function getAllNotes() {
  const c = await _client();
  const { data, error } = await c.from('notes').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(_mapNote);
}

async function searchNotes(query) {
  const c = await _client();
  const q = `%${query}%`;
  const { data, error } = await c
    .from('notes')
    .select('*')
    .or(`title.ilike.${q},transcript.ilike.${q},summary.ilike.${q}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(_mapNote);
}

async function deleteNote(id) {
  const c = await _client();
  const { error } = await c.from('notes').delete().eq('id', id);
  if (error) throw error;
}

async function addChatMessage({ noteId, role, content }) {
  const c = await _client();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in.');
  const { error } = await c.from('chat_messages').insert({ note_id: noteId, user_id: user.id, role, content });
  if (error) throw error;
}

async function getChatMessages(noteId) {
  const c = await _client();
  const { data, error } = await c
    .from('chat_messages')
    .select('*')
    .eq('note_id', noteId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => ({ id: row.id, note_id: row.note_id, role: row.role, content: row.content, created_at: row.created_at }));
}

async function clearChat(noteId) {
  const c = await _client();
  const { error } = await c.from('chat_messages').delete().eq('note_id', noteId);
  if (error) throw error;
}

module.exports = {
  createNote, updateNote, getNote, getAllNotes,
  searchNotes, deleteNote, addChatMessage, getChatMessages, clearChat,
};
