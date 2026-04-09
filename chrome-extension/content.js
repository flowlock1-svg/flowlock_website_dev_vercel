(function () {
  window.localStorage.setItem('flowlock_extension_connected', 'true');

  function getSession() {
    const authKey = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (!authKey) return null;
    try {
      const raw = localStorage.getItem(authKey);
      const parsed = JSON.parse(raw);
      // Handle both direct session and wrapped { currentSession: ... } formats
      return parsed?.access_token ? parsed : parsed?.currentSession ?? null;
    } catch (e) { return null; }
  }

  function sendAuth(session) {
    if (!session?.access_token) return;
    chrome.runtime.sendMessage({
      type: 'SET_AUTH',
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user_id: session.user?.id
    }, () => void chrome.runtime.lastError);
  }

  function trySync() {
    const session = getSession();
    if (session?.access_token) {
      sendAuth(session);
      return true;
    }
    return false;
  }

  // Try immediately
  if (!trySync()) {
    // If not ready yet, poll every 500ms for up to 10 seconds
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (trySync() || attempts >= 20) {
        clearInterval(interval);
      }
    }, 500);
  }

  // Also watch for future auth changes
  window.addEventListener('storage', (e) => {
    if (e.key?.startsWith('sb-') && e.key?.endsWith('-auth-token')) {
      trySync();
    }
  });
})();