const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

let client = null;

function configure() {
  const url = config.get('supabaseUrl');
  const anonKey = config.get('supabaseAnonKey');
  if (!url || !anonKey) {
    client = null;
    return null;
  }
  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const savedSession = config.get('supabaseSession');
  if (savedSession?.access_token && savedSession?.refresh_token) {
    client.auth.setSession(savedSession).catch(() => {});
  }
  return client;
}

function getClient() {
  if (!client) configure();
  return client;
}

async function signUp(email, password) {
  const c = getClient();
  if (!c) throw new Error('Supabase is not configured. Add your Supabase URL and anon key in Settings.');
  const { data, error } = await c.auth.signUp({ email, password });
  if (error) throw error;
  if (data.session) _persistSession(data.session);
  return { user: data.user, session: data.session };
}

async function signIn(email, password) {
  const c = getClient();
  if (!c) throw new Error('Supabase is not configured. Add your Supabase URL and anon key in Settings.');
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  _persistSession(data.session);
  return { user: data.user, session: data.session };
}

async function signOut() {
  const c = getClient();
  if (c) await c.auth.signOut();
  config.set('supabaseSession', null);
}

function _persistSession(session) {
  config.set('supabaseSession', {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

async function getCurrentUser() {
  const c = getClient();
  if (!c) return null;
  const { data, error } = await c.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

function isConfigured() {
  return !!(config.get('supabaseUrl') && config.get('supabaseAnonKey'));
}

module.exports = { configure, getClient, signUp, signIn, signOut, getCurrentUser, isConfigured };
