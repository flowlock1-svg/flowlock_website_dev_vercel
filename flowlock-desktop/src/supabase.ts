import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// In a real desktop app, we might use a robust config store (e.g., configstore or electron-store).
// For simplicity here, we'll store session locally in a config file in the home directory or app folder.

const CONFIG_PATH = path.join(__dirname, '..', '.session.json');

export const getSupabaseClient = (url: string, key: string) => {
    return createClient(url, key, {
        auth: {
            storage: {
                getItem: (key) => {
                    if (fs.existsSync(CONFIG_PATH)) {
                        try {
                            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
                            return config[key] || null;
                        } catch (e) { return null; }
                    }
                    return null;
                },
                setItem: (key, value) => {
                    let config: any = {};
                    if (fs.existsSync(CONFIG_PATH)) {
                        try {
                            config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
                        } catch (e) { }
                    }
                    config[key] = value;
                    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
                },
                removeItem: (key) => {
                    if (fs.existsSync(CONFIG_PATH)) {
                        try {
                            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
                            delete config[key];
                            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
                        } catch (e) { }
                    }
                }
            },
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
        }
    });
};
