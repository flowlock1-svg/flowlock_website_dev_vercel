const FLOWLOCK_URL = "http://localhost:3000/blocked"; // Change to production domain when ready

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("syncVault", { periodInMinutes: 1 });
  syncVaultState();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncVault") {
    syncVaultState();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sync_now") {
    syncVaultState().then(() => sendResponse({ status: "done" }));
    return true; // Keep message channel open for async response
  }
});

async function clearAllRules() {
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = oldRules.map(rule => rule.id);
  if (oldRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRuleIds });
  }
}

async function syncVaultState() {
  try {
    const data = await chrome.storage.local.get(["token", "userId", "supabaseUrl", "anonKey"]);
    const { token, userId, supabaseUrl, anonKey } = data;

    if (!token || !userId || !supabaseUrl || !anonKey) {
      await clearAllRules();
      await chrome.storage.local.set({ sessionActive: false, blockedCount: 0 });
      return;
    }

    // 1. Check if ANY active session exists for this user
    const sessionRes = await fetch(`${supabaseUrl}/rest/v1/study_sessions?user_id=eq.${userId}&status=eq.active&select=id`, {
      method: "GET",
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!sessionRes.ok) throw new Error(`Supabase Sessions Error: ${sessionRes.statusText}`);
    const sessions = await sessionRes.json();

    if (!sessions || sessions.length === 0) {
      await clearAllRules();
      await chrome.storage.local.set({ sessionActive: false, blockedCount: 0 });
      return;
    }

    // 2. We have an active session! Fetch the distraction vault
    await chrome.storage.local.set({ sessionActive: true });

    const vaultRes = await fetch(`${supabaseUrl}/rest/v1/distraction_vault?user_id=eq.${userId}&type=eq.website&select=identifier`, {
      method: "GET",
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!vaultRes.ok) throw new Error(`Supabase Vault Error: ${vaultRes.statusText}`);
    const vaultItems = await vaultRes.json();

    // 3. Update firewall rules based on vault items
    await clearAllRules();

    if (vaultItems && vaultItems.length > 0) {
      const addRules = vaultItems.map((item, index) => {
        // Simple sanitization: remove http:// or https:// and www.
        const domain = item.identifier.replace(/^https?:\/\//, '').replace(/^www\./, '');
        return {
          id: index + 1,
          priority: 1,
          action: {
            type: "redirect",
            redirect: { url: FLOWLOCK_URL }
          },
          condition: {
            urlFilter: `*://${domain}/*`,
            resourceTypes: ["main_frame"]
          }
        };
      });

      await chrome.declarativeNetRequest.updateDynamicRules({ addRules });
      await chrome.storage.local.set({ blockedCount: vaultItems.length });
    } else {
      await chrome.storage.local.set({ blockedCount: 0 });
    }

  } catch (error) {
    console.error("syncVaultState encountered an error:", error);
    // Silent fail on error keeps existing tracking rules alive in case of a temporary connection drop
  }
}
