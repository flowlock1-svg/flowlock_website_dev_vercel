window.localStorage.setItem('flowlock_extension_connected', 'true');
window.localStorage.setItem('flowlock_extension_version', '1.0.0');

const authKey = Object.keys(window.localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
if (authKey) {
  const session = JSON.parse(window.localStorage.getItem(authKey));
  chrome.runtime.sendMessage({
    type: 'SET_AUTH',
    access_token: session?.access_token,
    user_id: session?.user?.id
  });
}
