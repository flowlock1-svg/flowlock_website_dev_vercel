const { exec } = require('child_process');
const { initSupabase } = require('./supabase');

async function fetchVaultItems() {
  try {
    const supabase = await initSupabase();
    
    // Ensure we have an active session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) return [];

    const userId = session.user.id;

    // Fetch vault items for this user that are designated for desktop blocking
    const { data: vaultItems, error: vaultErr } = await supabase
      .from('distraction_vault')
      .select('identifier')
      .eq('user_id', userId)
      .eq('type', 'desktop_app');
      
    if (vaultErr) throw new Error(vaultErr.message);

    return vaultItems.map(item => item.identifier);
  } catch (error) {
    console.error("Vault fetching error:", error);
    return [];
  }
}

function killProcess(identifier) {
  const platform = process.platform;
  
  if (platform === 'win32') {
    exec(`taskkill /IM "${identifier}" /F`, (err) => {
      // Silently ignore errors - usually just means the process isn't running
    });
  } else if (platform === 'darwin' || platform === 'linux') {
    // pkill -x expects exact match to prevent accidentally killing similarly named apps
    exec(`pkill -x "${identifier}"`, (err) => {
      // Silently ignore errors
    });
  }
}

async function enforcVault(vaultItems) {
  if (!vaultItems || vaultItems.length === 0) return;
  
  console.log(`Enforcing vault: Locking ${vaultItems.length} desktop apps...`, vaultItems);
  
  vaultItems.forEach(identifier => {
    killProcess(identifier);
  });
}

module.exports = {
  fetchVaultItems,
  killProcess,
  enforcVault
};
