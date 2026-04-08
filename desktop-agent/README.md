# FlowLock Desktop Agent 🖥️

This Electron-based desktop application acts as the background enforcer for FlowLock on PC and Mac. When an active session is running, it periodically kills applications configured inside your `.distraction_vault` (e.g. `Spotify.exe`) via native OS execution commands.

## Setup Instructions

1. **Install Dependencies**  
   Open your terminal, navigate to the `desktop-agent/` directory, and run:
   ```bash
   npm install
   ```

2. **Configure Authentication**  
   Fill in the `config.json` template with your Supabase credentials:
   - `supabaseUrl`: Find this in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` 
   - `anonKey`: Find this in `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `userId`: Your Supabase Auth UUID  
   - `token`: An active, valid API Bearer token for your session

3. **Start the Agent**  
   Run:
   ```bash
   npm start
   ```
   *Note: Because this is a headless utility, no window will appear! Look for a blank space icon in your System Tray (Windows) or Menu Bar (Mac) where you can hover to see the FlowLock Agent status or force quit.*

---

## ⚡ Autostart Instructions

To have the FlowLock agent run automatically on system boot, follow these OS-specific steps once you package the application (or run standard bash scripts calling npm start).

**Windows**:  
1. Press `Win + R` and type `shell:startup`.
2. Right-click in the directory, select **New -> Shortcut**.  
3. Paste the path to your compiled electron binary, e.g., `"C:\path\to\desktop-agent\dist\flowlock-agent.exe"`.

**macOS**:  
1. Open **System Settings** -> **General** -> **Login Items**.
2. Click the `+` icon under "Open at Login".  
3. Highlight the compiled `.app` package and hit **Add**.
