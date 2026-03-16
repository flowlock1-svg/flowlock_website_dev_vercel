import { supabase } from './supabase';

let currentSessionId: string | null = null;
let currentActivity: {
    url: string;
    domain: string;
    startTime: number;
} | null = null;

// Helper to extract domain from URL
function getDomain(url: string): string {
    try {
        const { hostname } = new URL(url);
        return hostname;
    } catch (e) {
        return '';
    }
}

// Basic default classification
function classifyDomain(domain: string): 'study' | 'neutral' | 'distraction' {
    const distractions = ['youtube.com', 'netflix.com', 'facebook.com', 'twitter.com', 'instagram.com', 'reddit.com'];
    if (distractions.some(d => domain.includes(d))) return 'distraction';

    const study = ['github.com', 'stackoverflow.com', 'notion.so', 'wikipedia.org', 'docs.'];
    if (study.some(s => domain.includes(s))) return 'study';

    return 'neutral';
}

async function startSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Not logged in

    const { data, error } = await supabase
        .from('device_sessions')
        .insert({
            user_id: user.id,
            device_type: 'chrome',
            device_id: 'browser-ext', // Could generate a unique ID
            status: 'active'
        })
        .select()
        .single();

    if (data) {
        currentSessionId = data.id;
        console.log('Session started:', currentSessionId);
    } else {
        console.error('Failed to start session:', error);
    }
}

async function flushCurrentActivity() {
    if (!currentActivity || !currentActivity.url || !currentSessionId) return;

    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - currentActivity.startTime) / 1000);

    // Skip saving if less than a few seconds or an internal chrome page
    if (durationSeconds < 2 || currentActivity.url.startsWith('chrome://')) {
        currentActivity = null;
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const classification = classifyDomain(currentActivity.domain);

    await supabase.from('activity_logs').insert({
        session_id: currentSessionId,
        user_id: user.id,
        activity_type: 'browser',
        domain: currentActivity.domain,
        window_title: currentActivity.url, // We could fetch actual title if needed
        start_time: new Date(currentActivity.startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration_seconds: durationSeconds,
        classification: classification
    });

    console.log(`Saved activity: ${currentActivity.domain} for ${durationSeconds}s`);
    currentActivity = null;
}

// Ensure session exists
async function ensureSession() {
    if (!currentSessionId) {
        await startSession();
    }
}

// Handle tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await flushCurrentActivity(); // Flush the old tab

    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url) {
            handleTabStart(tab.url);
        }
    } catch (e) {
        console.warn("Could not handle tab activation:", e);
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active && tab.url) {
        await flushCurrentActivity(); // Flush if navigating away from previous URL
        handleTabStart(tab.url);
    }
});

// Handle window focus changed (idle / other apps)
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Chrome lost focus (user switched to another Windows app)
        await flushCurrentActivity();
    } else {
        // Chrome regained focus, get active tab
        try {
            const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
            if (tabs && tabs.length > 0 && tabs[0].url) {
                handleTabStart(tabs[0].url);
            }
        } catch (e) {
            console.warn("Could not handle window focus:", e);
        }
    }
});

async function handleTabStart(url: string) {
    if (url.startsWith('chrome://')) return; // Ignore internal chrome pages

    await ensureSession();
    currentActivity = {
        url: url,
        domain: getDomain(url),
        startTime: Date.now()
    };
}

// Periodic flush every 2 minutes just in case they stay on one tab forever
chrome.alarms.create("periodicSync", { periodInMinutes: 2 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "periodicSync") {
        if (currentActivity) {
            const url = currentActivity.url;
            await flushCurrentActivity();
            // Restart tracking for the current active tab
            handleTabStart(url);
        }
    }
});

// Initial startup
chrome.runtime.onStartup.addListener(() => {
    console.log("FlowLock Extension Started up");
});
