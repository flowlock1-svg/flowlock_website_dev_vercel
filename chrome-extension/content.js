(function() {
  window.localStorage.setItem('flowlock_extension_connected', 'true');

  const authKey = Object.keys(localStorage).find(
    k => k.startsWith('sb-') && k.endsWith('-auth-token')
  );
  if (!authKey) return;

  try {
    const session = JSON.parse(localStorage.getItem(authKey));
    if (!session?.access_token) return;

    const payload = {
      type: 'SET_AUTH',
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user_id: session.user?.id
    };

    // Try sending immediately
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        // Background not ready yet — retry after 1 second
        setTimeout(() => {
          chrome.runtime.sendMessage(payload, () => {
            if (chrome.runtime.lastError) {
              // Final fallback: write directly to chrome.storage.local
              // This guarantees the token is persisted even if the service worker
              // is still cold-starting
              chrome.storage.local.set({
                'sb-access-token': session.access_token,
                'sb-refresh-token': session.refresh_token,
                'sb-user-id': session.user?.id
              });
            }
          });
        }, 1000);
      }
    });
  } catch(e) {
    console.error('FlowLock content.js error:', e);
  }
})();
