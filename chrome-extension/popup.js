document.addEventListener("DOMContentLoaded", async () => {
  const statusContainer = document.getElementById("statusContainer");
  const blockedStatusContainer = document.getElementById("blockedStatusContainer");
  const loginForm = document.getElementById("loginForm");
  const connectedView = document.getElementById("connectedView");

  const supabaseUrlInput = document.getElementById("supabaseUrl");
  const anonKeyInput = document.getElementById("anonKey");
  const userIdInput = document.getElementById("userId");
  const tokenInput = document.getElementById("token");
  
  const saveBtn = document.getElementById("saveBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  async function updateUI() {
    const data = await chrome.storage.local.get(["token", "userId", "sessionActive", "blockedCount"]);
    
    if (data.token && data.userId) {
      statusContainer.textContent = "Connected to FlowLock";
      statusContainer.style.color = "#22c55e"; // emerald-500
      
      loginForm.classList.add("hidden");
      connectedView.classList.remove("hidden");
      blockedStatusContainer.classList.remove("hidden");

      if (data.sessionActive) {
        const count = data.blockedCount || 0;
        blockedStatusContainer.textContent = `${count} site${count !== 1 ? 's' : ''} currently blocked.`;
        blockedStatusContainer.style.color = "#ef4444"; // red-500
      } else {
        blockedStatusContainer.textContent = "No active session.";
        blockedStatusContainer.style.color = "#a1a1aa"; // zinc-400
      }
    } else {
      statusContainer.textContent = "Not connected";
      statusContainer.style.color = "#ef4444"; // red-500
      
      loginForm.classList.remove("hidden");
      connectedView.classList.add("hidden");
      blockedStatusContainer.classList.add("hidden");
    }
  }

  // Initial UI render
  await updateUI();

  // Save credentials
  saveBtn.addEventListener("click", async () => {
    const url = supabaseUrlInput.value.trim();
    const key = anonKeyInput.value.trim();
    const id = userIdInput.value.trim();
    const token = tokenInput.value.trim();

    if (url && key && id && token) {
      saveBtn.textContent = "Saving...";
      saveBtn.disabled = true;
      
      await chrome.storage.local.set({
        supabaseUrl: url,
        anonKey: key,
        userId: id,
        token: token,
        // Reset state so next sync calculates fresh
        sessionActive: false,
        blockedCount: 0
      });
      
      saveBtn.textContent = "Connect to FlowLock";
      saveBtn.disabled = false;
      
      // Attempt immediate sync
      chrome.runtime.sendMessage({ action: "sync_now" }).catch(() => {});
      
      // Give the background script a short moment to sync, then update UI
      setTimeout(updateUI, 1000);
      updateUI();
    }
  });

  // Logout
  logoutBtn.addEventListener("click", async () => {
    await chrome.storage.local.remove(["supabaseUrl", "anonKey", "userId", "token", "sessionActive", "blockedCount"]);
    
    // Trigger sync to clear rules immediately
    chrome.runtime.sendMessage({ action: "sync_now" }).catch(() => {});
    
    await updateUI();
  });
});
