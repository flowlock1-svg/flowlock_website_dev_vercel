"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const desktop_idle_1 = __importDefault(require("desktop-idle"));
const inquirer_1 = __importDefault(require("inquirer"));
const dotenv_1 = __importDefault(require("dotenv"));
const supabase_1 = require("./supabase");
dotenv_1.default.config();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
const supabase = (0, supabase_1.getSupabaseClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
// Define minimum idle seconds before tracking as "idle" instead of app
const IDLE_THRESHOLD_SECONDS = 60;
let currentSessionId = null;
let currentActivity = null;
// Mock basic classifications locally - ideally pulled from Supabase
function classifyApp(appName) {
    const app = appName.toLowerCase();
    const distractions = ['spotify.exe', 'discord.exe', 'steam.exe', 'vlc.exe', 'epicgameslauncher.exe'];
    if (distractions.some(d => app.includes(d)))
        return 'distraction';
    const study = ['code.exe', 'notion.exe', 'word.exe', 'powerpnt.exe', 'idea64.exe'];
    if (study.some(s => app.includes(s)))
        return 'study';
    return 'neutral';
}
async function startTrackingSession(userId) {
    const { data, error } = await supabase
        .from('device_sessions')
        .insert({
        user_id: userId,
        device_type: 'windows',
        device_id: require('os').hostname(),
        status: 'active'
    })
        .select()
        .single();
    if (data) {
        currentSessionId = data.id;
        console.log(`[FlowLock] Syncing started. Session ID: ${currentSessionId}`);
        startPolling();
    }
    else {
        console.error('Failed to start session on backend:', error);
    }
}
async function flushActivity() {
    if (!currentActivity || !currentSessionId)
        return;
    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - currentActivity.startTime) / 1000);
    if (durationSeconds < 2) {
        currentActivity = null;
        return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return;
    let classification = classifyApp(currentActivity.app);
    let appName = currentActivity.app;
    // Is it idle? If it was idle for longer than tracking period...
    // DesktopIdle tracks total seconds. We only check *current* idle state when flushing.
    // If the computer has been idle for 60 seconds, we treat this flushed time block as 'idle' 
    // instead of the foreground app.
    if (desktop_idle_1.default.getIdleTime() >= IDLE_THRESHOLD_SECONDS) {
        classification = 'idle';
        appName = 'System Idle';
    }
    try {
        await supabase.from('activity_logs').insert({
            session_id: currentSessionId,
            user_id: user.id,
            activity_type: 'app',
            app_name: appName,
            window_title: currentActivity.title,
            start_time: new Date(currentActivity.startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            duration_seconds: durationSeconds,
            classification: classification
        });
        // process.stdout.write(`\r[FlowLock] Synced: ${appName} (${durationSeconds}s) `.padEnd(80));
    }
    catch (err) {
        // Silently fail if offline, ideal client would cache offline.
    }
    currentActivity = null;
}
async function pollActiveWindow() {
    try {
        const activeWinModule = await Promise.resolve().then(() => __importStar(require('active-win')));
        const activeWin = activeWinModule.default || activeWinModule; // Handle dynamic esm imports
        const window = await activeWin();
        if (window) {
            const app = window.owner.name;
            const title = window.title;
            // Did the app change?
            if (!currentActivity || currentActivity.app !== app || currentActivity.title !== title) {
                await flushActivity();
                // Also check if idle state changed
                currentActivity = {
                    app,
                    title,
                    startTime: Date.now()
                };
            }
        }
        else {
            // No active window? Might happen on lock screens
            await flushActivity();
        }
    }
    catch (error) {
        // Ignore permissions errors sometimes thrown by active-win
    }
}
function startPolling() {
    // Poll every 5 seconds
    setInterval(pollActiveWindow, 5000);
    // Ensure we flush on exit
    process.on('SIGINT', async () => {
        console.log("\n[FlowLock] Shutting down, flushing last activity...");
        await flushActivity();
        // Mark session as completed
        if (currentSessionId) {
            await supabase
                .from('device_sessions')
                .update({ status: 'completed', ended_at: new Date().toISOString() })
                .eq('id', currentSessionId);
            console.log("[FlowLock] Session ended.");
        }
        process.exit(0);
    });
}
async function main() {
    console.log("=========================================");
    console.log("   FlowLock Windows Background Agent");
    console.log("=========================================\n");
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        console.log(`Logged in as: ${session.user.email}`);
        startTrackingSession(session.user.id);
    }
    else {
        console.log("You are not logged in.");
        const answers = await inquirer_1.default.prompt([
            { type: 'input', name: 'email', message: 'Email:' },
            { type: 'password', name: 'password', message: 'Password:' }
        ]);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: answers.email,
            password: answers.password
        });
        if (error) {
            console.error("Login failed:", error.message);
            process.exit(1);
        }
        else {
            console.log("\nLogin successful!");
            startTrackingSession(data.user.id);
        }
    }
}
main();
