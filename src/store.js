/**
 * Unified note/chat store. Uses Supabase (per signed-in user) as the
 * source of truth when logged in, otherwise falls back to the local
 * JSON store so the app still works offline / signed out.
 */
const localDb = require('./database');
const remote = require('./remoteStore');
const { getCurrentUser } = require('./supabaseClient');

async function _isRemote() {
  const user = await getCurrentUser();
  return !!user;
}

function init() {
  localDb.init();
}

async function createNote(args) {
  return (await _isRemote()) ? remote.createNote(args) : localDb.createNote(args);
}

async function updateNote(id, fields) {
  return (await _isRemote()) ? remote.updateNote(id, fields) : localDb.updateNote(id, fields);
}

async function getNote(id) {
  return (await _isRemote()) ? remote.getNote(id) : localDb.getNote(id);
}

async function getAllNotes() {
  return (await _isRemote()) ? remote.getAllNotes() : localDb.getAllNotes();
}

async function searchNotes(query) {
  return (await _isRemote()) ? remote.searchNotes(query) : localDb.searchNotes(query);
}

async function deleteNote(id) {
  return (await _isRemote()) ? remote.deleteNote(id) : localDb.deleteNote(id);
}

async function addChatMessage(args) {
  return (await _isRemote()) ? remote.addChatMessage(args) : localDb.addChatMessage(args);
}

async function getChatMessages(noteId) {
  return (await _isRemote()) ? remote.getChatMessages(noteId) : localDb.getChatMessages(noteId);
}

async function clearChat(noteId) {
  return (await _isRemote()) ? remote.clearChat(noteId) : localDb.clearChat(noteId);
}

function getAudioDir() {
  return localDb.getAudioDir();
}

module.exports = {
  init, createNote, updateNote, getNote, getAllNotes,
  searchNotes, deleteNote, addChatMessage, getChatMessages, clearChat, getAudioDir,
};
