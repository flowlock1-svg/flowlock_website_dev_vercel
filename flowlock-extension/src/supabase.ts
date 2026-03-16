import { createClient } from "@supabase/supabase-js";

declare const process: {
    env: {
        NEXT_PUBLIC_SUPABASE_URL?: string;
        NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    }
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: {
            getItem: (key: string): Promise<string | null> => {
                return new Promise((resolve) => {
                    chrome.storage.local.get([key], (result) => {
                        const val = result[key];
                        resolve(typeof val === 'string' ? val : null);
                    });
                });
            },
            setItem: (key: string, value: string): Promise<void> => {
                return new Promise((resolve) => {
                    chrome.storage.local.set({ [key]: value }, () => {
                        resolve();
                    });
                });
            },
            removeItem: (key: string): Promise<void> => {
                return new Promise((resolve) => {
                    chrome.storage.local.remove([key], () => {
                        resolve();
                    });
                });
            }
        },
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
    }
});
