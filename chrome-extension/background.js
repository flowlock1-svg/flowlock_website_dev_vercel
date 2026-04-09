const SUPABASE_URL = "https://cutgjwfkgkoynmxpsntr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dGdqd2ZrZ2tveW5teHBzbnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjI1MDksImV4cCI6MjA4ODY5ODUwOX0.y0eHIyS-tZUH4_q3zqGPuDO8oiRlyBsFdN1_dNbvNrE";
const BLOCKED_URL = "https://flowlock-website-dev-vercel.vercel.app/blocked";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("syncVault", { periodInMinutes: 1 });
  syncVaultAndBlock();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncVault") {
    syncVaultAndBlock();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sync_now") {
    syncVaultAndBlock().then(() => sendResponse({ status: "done" }));
    return true; 
  }
  
  if (message.type === 'SET_AUTH') {
    chrome.storage.local.set({
      'sb-access-token': message.access_token,
      'sb-user-id': message.user_id
    }).then(() => {
      syncVaultAndBlock();
    });
  }
});

// Legacy listener for PING just in case
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'connected' });
    return;
  }
});

async function clearBlockingRules() {
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = oldRules.map(rule => rule.id);
  if (oldRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRuleIds });
  }
}

async function applyBlockingRules(domains) {
  // Remove all existing dynamic rules first
  await clearBlockingRules();

  if (!domains || domains.length === 0) return;

  const addRules = domains.map((domainStr, index) => {
    // Simple sanitization: remove http:// or https:// and www.
    const cleanDomain = domainStr.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return {
      id: index + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { url: BLOCKED_URL }
      },
      condition: {
        urlFilter: `*://${cleanDomain}/*`,
        resourceTypes: ["main_frame"]
      }
    };
  });

  await chrome.declarativeNetRequest.updateDynamicRules({ addRules });
}

async function syncVaultAndBlock() {
  try {
    const data = await chrome.storage.local.get(['sb-access-token', 'sb-user-id']);
    const token = data['sb-access-token'];
    const userId = data['sb-user-id'];

    if (!token || !userId) {
      await clearBlockingRules();
      return;
    }

    // 1. Check if ANY active session exists for this user
    const sessionRes = await fetch(`${SUPABASE_URL}/rest/v1/study_sessions?status=eq.active&select=id`, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!sessionRes.ok) {
      // If token is invalid or request fails, fail open (clear rules)
      await clearBlockingRules();
      return;
    }

    const sessions = await sessionRes.json();

    if (!sessions || sessions.length === 0) {
      // No active session -> clear blocking rules and return
      await clearBlockingRules();
      return;
    }

    // 2. If active session -> fetch vault websites
    const vaultRes = await fetch(`${SUPABASE_URL}/rest/v1/distraction_vault?type=eq.website&select=identifier`, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!vaultRes.ok) {
      await clearBlockingRules();
      return;
    }
    
    const vaultItems = await vaultRes.json();
    const domains = vaultItems.map(item => item.identifier);

    // 3. Apply blocking rules
    await applyBlockingRules(domains);

  } catch (error) {
    console.error("syncVaultAndBlock encountered an error:", error);
    // On unexpected errors, we could clear rules or keep them. 
    // Fail-open is generally better for UX if there's a temporary network drop.
    await clearBlockingRules();
  }
}
