const { createClient } = require('@supabase/supabase-js');
const { safeStorage, app } = require('electron');
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = "https://cutgjwfkgkoynmxpsntr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dGdqd2ZrZ2tveW5teHBzbnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjI1MDksImV4cCI6MjA4ODY5ODUwOX0.y0eHIyS-tZUH4_q3zqGPuDO8oiRlyBsFdN1_dNbvNrE";

let supabase = null;
let realtimeChannel = null;

function getSessionPath() {
  return path.join(app.getPath('userData'), 'session.json');
}

async function initSupabase() {
  if (supabase) return supabase;

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Handled manually below via safeStorage
      detectSessionInUrl: false
    }
  });

  // Load existing session if available
  const sessionPath = getSessionPath();
  if (fs.existsSync(sessionPath)) {
    try {
      const encryptedSession = fs.readFileSync(sessionPath);
      // safeStorage is only available after app.whenReady()!
      if (safeStorage.isEncryptionAvailable()) {
        const sessionJson = safeStorage.decryptString(encryptedSession);
        const sessionObj = JSON.parse(sessionJson);
        
        const { error } = await supabase.auth.setSession({
          access_token: sessionObj.access_token,
          refresh_token: sessionObj.refresh_token
        });
        
        if (error) console.error("Failed to restore session from storage:", error);
      }
    } catch (err) {
      console.error("Error decrypting session:", err);
      fs.unlinkSync(sessionPath); // Invalid or corrupted file, wipe it
    }
  }

  // Subscribe to auth state changes to dynamically persist token refreshes
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      const sessionString = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user_id: session.user.id
      });
      if (safeStorage.isEncryptionAvailable()) {
         const encrypted = safeStorage.encryptString(sessionString);
         fs.writeFileSync(getSessionPath(), encrypted);
      }
    } else if (event === 'SIGNED_OUT') {
      if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
    }
  });

  return supabase;
}

async function setupRealtimeWatcher(onSessionChangeCallback) {
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const userId = session.user.id;

  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel('session-watch')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'study_sessions',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      if (onSessionChangeCallback) onSessionChangeCallback();
    })
    .subscribe();
}

async function handleAuthCallback(accessToken, refreshToken) {
  if (!supabase) await initSupabase();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  return { data, error };
}

async function signOut() {
  if (realtimeChannel && supabase) {
    await supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  if (supabase) {
    await supabase.auth.signOut();
  } else {
    const sessionPath = getSessionPath();
    if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
  }
}

async function hasStoredSession() {
  const sessionPath = getSessionPath();
  return fs.existsSync(sessionPath);
}

async function checkActiveSession() {
  if (!supabase) await initSupabase();

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) return false;

  const userId = session.user.id;

  try {
    const { data: activeSessions, error: dbSessionErr } = await supabase
      .from('study_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active');

    return (!dbSessionErr && activeSessions && activeSessions.length > 0);
  } catch (error) {
    console.error("Supabase session polling error:", error);
    return false;
  }
}

module.exports = {
  initSupabase,
  handleAuthCallback,
  hasStoredSession,
  signOut,
  checkActiveSession,
  setupRealtimeWatcher
};
