import { supabase } from './supabase';

document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const loginView = document.getElementById('login-view')!;
    const activeView = document.getElementById('active-view')!;
    const loginBtn = document.getElementById('login-btn')!;
    const logoutBtn = document.getElementById('logout-btn')!;
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const errorMsg = document.getElementById('error-msg')!;
    const currentDomainEl = document.getElementById('current-domain')!;

    // Check auth status
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        showActiveView();
    } else {
        showLoginView();
    }

    // Login Handler
    loginBtn.addEventListener('click', async () => {
        errorMsg.classList.add('hidden');
        loginBtn.innerText = 'Loggin In...';

        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            errorMsg.innerText = 'Email and password required';
            errorMsg.classList.remove('hidden');
            loginBtn.innerText = 'Log In';
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            errorMsg.innerText = error.message;
            errorMsg.classList.remove('hidden');
            loginBtn.innerText = 'Log In';
        } else if (data.session) {
            showActiveView();
        }
    });

    // Logout Handler
    logoutBtn.addEventListener('click', async () => {
        logoutBtn.innerText = 'Logging out...';
        await supabase.auth.signOut();
        showLoginView();
    });

    // Fetch current tab to display
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0].url) {
            try {
                const { hostname } = new URL(tabs[0].url);
                currentDomainEl.innerText = hostname;
            } catch (e) {
                currentDomainEl.innerText = tabs[0].url;
            }
        }
    });

    function showLoginView() {
        loginView.classList.remove('hidden');
        activeView.classList.add('hidden');
        loginBtn.innerText = 'Log In';
    }

    function showActiveView() {
        activeView.classList.remove('hidden');
        loginView.classList.add('hidden');
        logoutBtn.innerText = 'Log Out';
    }
});
