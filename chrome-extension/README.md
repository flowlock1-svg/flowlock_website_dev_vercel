# FlowLock Vault Chrome Extension 🔒

This extension acts as the bridge between FlowLock's web dashboard and your Chrome browser. When active, it synchronizes with your `distraction_vault` from Supabase and automatically blocks distracting websites during your focus sessions.

## 🚀 How to Install (Developer Mode)

Since this extension is in active development, you'll need to load it locally using Chrome's "Developer Mode".
Follow these steps:

1. Open a new tab in Google Chrome and navigate to:
   `chrome://extensions/`
   
2. In the top right corner of the Extensions page, toggle **Developer mode** ON.

3. Click the **Load unpacked** button that appears in the top-left menu bar.

4. A file browser will open. Navigate to your project folder and select this directory:
   `Flowlock_website_vercel/flowlock_website_dev_vercel/chrome-extension`

5. Verify that **FlowLock Vault** appears in your extensions list and is toggled ON.

## 🔌 How to Connect

Once installed, pin the extension to your Chrome toolbar so you can easily access it.

1. Click on the **FlowLock Vault** icon in your toolbar to open the popup.
2. Fill out your Supabase environment variables and authentication details:
   - **Supabase URL**: Your `NEXT_PUBLIC_SUPABASE_URL` (from `.env.local`).
   - **Anon Key**: Your `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from `.env.local`).
   - **User ID**: Your Supabase Auth User ID (UUID).
   - **Access Token**: A valid Bearer token for your session.
3. Click **Connect to FlowLock**. The extension will now automatically sync your Vault every 1 minute.

> **Note**: For production, we recommend implementing a seamless OAuth/Token-sharing flow between the main FlowLock app and the extension instead of requiring users to manually paste tokens.

## 🔧 Behind the Scenes

- **Declarative Net Request**: The extension uses MV3's `declarativeNetRequest` API rather than older, less secure webRequest listeners. 
- **Auto-Sync**: Background service workers use a `chrome.alarms` trigger to quietly hit the REST API every 60 seconds to pull the latest rules and session status.
- **Fail-Safe**: If the internet disconnects temporarily, existing blocking rules are intentionally kept alive until the next successful status check guarantees your session is actually over.
