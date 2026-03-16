"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseClient = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// In a real desktop app, we might use a robust config store (e.g., configstore or electron-store).
// For simplicity here, we'll store session locally in a config file in the home directory or app folder.
const CONFIG_PATH = path_1.default.join(__dirname, '..', '.session.json');
const getSupabaseClient = (url, key) => {
    return (0, supabase_js_1.createClient)(url, key, {
        auth: {
            storage: {
                getItem: (key) => {
                    if (fs_1.default.existsSync(CONFIG_PATH)) {
                        try {
                            const config = JSON.parse(fs_1.default.readFileSync(CONFIG_PATH, 'utf-8'));
                            return config[key] || null;
                        }
                        catch (e) {
                            return null;
                        }
                    }
                    return null;
                },
                setItem: (key, value) => {
                    let config = {};
                    if (fs_1.default.existsSync(CONFIG_PATH)) {
                        try {
                            config = JSON.parse(fs_1.default.readFileSync(CONFIG_PATH, 'utf-8'));
                        }
                        catch (e) { }
                    }
                    config[key] = value;
                    fs_1.default.writeFileSync(CONFIG_PATH, JSON.stringify(config));
                },
                removeItem: (key) => {
                    if (fs_1.default.existsSync(CONFIG_PATH)) {
                        try {
                            const config = JSON.parse(fs_1.default.readFileSync(CONFIG_PATH, 'utf-8'));
                            delete config[key];
                            fs_1.default.writeFileSync(CONFIG_PATH, JSON.stringify(config));
                        }
                        catch (e) { }
                    }
                }
            },
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
        }
    });
};
exports.getSupabaseClient = getSupabaseClient;
