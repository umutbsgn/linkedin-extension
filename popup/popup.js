import { createSubscriptionManager } from './subscription-manager.js';
import {
    initAnalytics,
    trackEvent,
    trackLoginAttempt,
    trackLoginSuccess,
    trackLoginFailure,
    trackRegistrationAttempt,
    trackRegistrationSuccess,
    trackRegistrationFailure,
    trackSessionStart
} from './analytics.js';

import { API_ENDPOINTS } from '../config.js';
import apiClient from './api-client.js';

// Default system prompts
const DEFAULT_SYSTEM_PROMPT = `You are a flexible LinkedIn communication partner. Your task is to analyze the author's style, respond accordingly, and provide casual value. Your response should be concise, maximum 120 characters, and written directly in the author's style.`;
const DEFAULT_CONNECT_SYSTEM_PROMPT = `You are a LinkedIn connection request assistant. Your task is to analyze the recipient's profile and craft a personalized, concise connection message. Keep it friendly, professional, and highlight a shared interest or mutual benefit. Maximum 160 characters.`;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle tracking events from background script
    if (request.action === 'posthog_track_from_background') {
        try {
            console.log('Received tracking event from background:', request.eventName);

            // Handle specific event types directly
            if (request.eventName === 'post_comment' || request.eventName === 'connection_message') {
                // Use trackEvent from analytics.js to ensure consistent tracking
                trackEvent(request.eventName, request.properties);

                // Also try to use window.posthog directly as a backup
                if (window.posthog) {
                    window.posthog.capture(request.eventName, request.properties);
                    console.log(`${request.eventName} event tracked from background:`, request.properties);
                }
            }
            // Prioritize Autocapture
            else if (request.eventName === 'Autocapture') {
                // Use trackEvent from analytics.js to ensure consistent tracking
                trackEvent('Autocapture', request.properties);

                // Also try to use window.posthog directly as a backup
                if (window.posthog) {
                    window.posthog.capture('Autocapture', request.properties);
                    console.log(`Autocapture event tracked from background:`, request.properties);
                }
            }
            // For any other events, map to post_comment (preferred)
            else {
                const mappedProperties = {
                    ...request.properties,
                    original_event: request.eventName
                };

                trackEvent('post_comment', mappedProperties);

                if (window.posthog) {
                    window.posthog.capture('post_comment', mappedProperties);
                    console.log(`Event mapped to post_comment: ${request.eventName}`, mappedProperties);
                }
            }

            if (sendResponse) {
                sendResponse({ success: true });
            }
        } catch (error) {
            console.error('Error handling posthog_track_from_background:', error);
            if (sendResponse) {
                sendResponse({ success: false, error: error.message });
            }
        }
        return true;
    }
});

document.addEventListener('DOMContentLoaded', async() => {
    const promptInput = document.getElementById('prompt');
    const submitButton = document.getElementById('submit');
    const responseDiv = document.getElementById('response');
    const systemPromptInput = document.getElementById('systemPrompt');
    const savePromptButton = document.getElementById('savePrompt');
    const resetPromptButton = document.getElementById('resetPrompt');
    const connectSystemPromptInput = document.getElementById('connectSystemPrompt');
    const saveConnectPromptButton = document.getElementById('saveConnectPrompt');
    const resetConnectPromptButton = document.getElementById('resetConnectPrompt');
    const authForm = document.getElementById('authForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    const authStatus = document.getElementById('authStatus');
    const signOutButton = document.getElementById('signOutButton');
    const postsTab = document.getElementById('postsTab');
    const connectTab = document.getElementById('connectTab');
    const subscriptionTab = document.getElementById('subscriptionTab');
    const postsContent = document.getElementById('postsContent');
    const connectContent = document.getElementById('connectContent');
    const subscriptionContent = document.getElementById('subscriptionContent');
    const settingsContent = document.getElementById('settingsContent');
    const subscriptionContainer = document.getElementById('subscriptionContainer');

    // Initialize extension
    initializeExtension();

    // Event listeners
    submitButton.addEventListener('click', analyzeText);
    resetPromptButton.addEventListener('click', resetSystemPrompt);
    resetConnectPromptButton.addEventListener('click', resetConnectSystemPrompt);
    loginButton.addEventListener('click', () => authenticate('login'));
    registerButton.addEventListener('click', () => authenticate('register'));
    signOutButton.addEventListener('click', signOut);
    savePromptButton.addEventListener('click', saveUserSettings);
    saveConnectPromptButton.addEventListener('click', saveUserSettings);
    postsTab.addEventListener('click', () => switchTab('posts'));
    connectTab.addEventListener('click', () => switchTab('connect'));

    function resetConnectSystemPrompt() {
        connectSystemPromptInput.value = DEFAULT_CONNECT_SYSTEM_PROMPT;
        saveUserSettings();
    }

    // Initialize subscription manager
    let subscriptionManager = null;

    // Load subscription data when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        if (subscriptionContainer) {
            subscriptionManager = createSubscriptionManager(
                subscriptionContainer,
                apiClient,
                showStatus
            );
            subscriptionManager.loadSubscriptionStatus();
        }
    });

    // Vercel backend URL settings removed

    function switchTab(tab) {
        // Determine previous tab
        let previousTab = 'posts';
        if (connectTab.classList.contains('active')) {
            previousTab = 'connect';
        }

        // Reset all tabs
        postsTab.classList.remove('active');
        connectTab.classList.remove('active');
        postsContent.classList.remove('active');
        connectContent.classList.remove('active');

        // Activate selected tab
        if (tab === 'posts') {
            postsTab.classList.add('active');
            postsContent.classList.add('active');
        } else if (tab === 'connect') {
            connectTab.classList.add('active');
            connectContent.classList.add('active');
        }

        // Track tab change
        trackEvent('Tab_Change', { from_tab: previousTab, to_tab: tab });
    }

    // Functions
    async function initializeExtension() {
        try {
            // Initialize API client
            await apiClient.initialize();

            // Check if user is authenticated
            const isAuthenticated = await apiClient.isAuthenticated();

            if (isAuthenticated) {
                showAuthenticatedUI();
                await loadUserSettings();

                // Get user profile for analytics
                try {
                    const userProfile = await apiClient.getUserProfile();
                    if (userProfile && userProfile.email) {
                        // Identify user in analytics
                        trackEvent('User_Identified', {
                            user_id: userProfile.id,
                            email: userProfile.email
                        });

                        // Start session tracking
                        trackSessionStart(userProfile.email);
                    }
                } catch (error) {
                    console.error('Error getting user profile:', error);
                }
            } else {
                showUnauthenticatedUI();
            }

            // Initialize analytics
            initAnalytics();
        } catch (error) {
            console.error('Error initializing extension:', error);
            showStatus('Error initializing extension: ' + error.message, 'error');
            showUnauthenticatedUI();
        }
    }

    async function loadUserSettings() {
        try {
            // Get user settings from API
            const settings = await apiClient.getUserSettings();

            if (settings) {
                systemPromptInput.value = settings.system_prompt || DEFAULT_SYSTEM_PROMPT;
                connectSystemPromptInput.value = settings.connect_system_prompt || DEFAULT_CONNECT_SYSTEM_PROMPT;

                // Save to local storage for background script
                await chrome.storage.local.set({
                    systemPrompt: settings.system_prompt || DEFAULT_SYSTEM_PROMPT,
                    connectSystemPrompt: settings.connect_system_prompt || DEFAULT_CONNECT_SYSTEM_PROMPT
                });

                showStatus('User settings loaded successfully', 'success');
            } else {
                // If no settings found, use defaults
                systemPromptInput.value = DEFAULT_SYSTEM_PROMPT;
                connectSystemPromptInput.value = DEFAULT_CONNECT_SYSTEM_PROMPT;

                // Save defaults to server
                await saveUserSettings();
            }
        } catch (error) {
            console.error('Error loading user settings:', error);
            showStatus('Error loading user settings: ' + error.message, 'error');

            // Use defaults if error
            systemPromptInput.value = DEFAULT_SYSTEM_PROMPT;
            connectSystemPromptInput.value = DEFAULT_CONNECT_SYSTEM_PROMPT;
        }
    }

    async function saveUserSettings() {
        const systemPrompt = systemPromptInput.value.trim();
        const connectSystemPrompt = connectSystemPromptInput.value.trim();

        // Track settings change attempt
        trackEvent('Settings_Change_Attempt', {
            system_prompt_length: systemPrompt.length,
            connect_system_prompt_length: connectSystemPrompt.length
        });

        try {
            // Check if user is authenticated
            const isAuthenticated = await apiClient.isAuthenticated();
            if (!isAuthenticated) {
                throw new Error('User not authenticated');
            }

            // Prepare settings data
            const settingsData = {
                system_prompt: systemPrompt,
                connect_system_prompt: connectSystemPrompt
            };

            // Update settings on server
            await apiClient.updateUserSettings(settingsData);

            // Update local storage for background script
            await chrome.storage.local.set({
                systemPrompt,
                connectSystemPrompt
            });

            showStatus('Settings saved successfully', 'success');

            // Track settings change success
            trackEvent('Settings_Change_Success', {
                system_prompt_length: systemPrompt.length,
                connect_system_prompt_length: connectSystemPrompt.length
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            showStatus(`Error: ${error.message}`, 'error');

            // Track settings change failure
            trackEvent('Settings_Change_Failure', {
                error: error.message
            });
        }
    }

    async function analyzeText() {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            showStatus('Please enter text to analyze', 'error');
            return;
        }

        // Track analyze text attempt
        trackEvent('Analyze_Text_Attempt', {
            prompt_length: prompt.length
        });

        const startTime = Date.now();

        try {
            submitButton.disabled = true;
            responseDiv.textContent = 'Analyzing...';

            const { systemPrompt } = await chrome.storage.local.get(['systemPrompt']);

            const response = await chrome.runtime.sendMessage({
                action: 'analyze',
                text: prompt,
                systemPrompt: systemPrompt
            });

            if (response.success) {
                responseDiv.textContent = response.data.content[0].text;

                // Track analyze text success
                trackEvent('Analyze_Text_Success', {
                    prompt_length: prompt.length,
                    response_length: response.data.content[0].text.length,
                    duration_ms: Date.now() - startTime
                });
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            showStatus(`Error: ${error.message}`, 'error');
            responseDiv.textContent = '';

            // Track analyze text failure
            trackEvent('Analyze_Text_Failure', {
                prompt_length: prompt.length,
                error: error.message,
                duration_ms: Date.now() - startTime
            });
        } finally {
            submitButton.disabled = false;
        }
    }

    function resetSystemPrompt() {
        systemPromptInput.value = DEFAULT_SYSTEM_PROMPT;
        saveUserSettings();
    }

    function showDebugInfo(info) {
        const debugInfoElement = document.getElementById('debugInfo');
        debugInfoElement.textContent = JSON.stringify(info, null, 2);
        debugInfoElement.style.display = 'block';
    }

    async function authenticate(action) {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const startTime = Date.now();

        console.log(`Attempting to ${action} with email: ${email}`);

        if (!email || !password) {
            showAuthStatus('Please enter both email and password', 'error');
            return;
        }

        // Track attempt
        if (action === 'login') {
            trackLoginAttempt(email);
        } else {
            trackRegistrationAttempt(email);
        }

        try {
            let result;

            if (action === 'login') {
                console.log('Attempting login');
                result = await apiClient.login(email, password);
            } else {
                console.log('Attempting registration');
                result = await apiClient.register(email, password);
            }

            console.log(`${action} result:`, result);

            // Track success with duration
            const duration = Date.now() - startTime;
            if (action === 'login') {
                trackLoginSuccess(email);
                trackEvent('Login_Duration', { duration_ms: duration });

                showAuthStatus('Login successful', 'success');
                showAuthenticatedUI();
                await loadUserSettings();
                await notifyAuthStatusChange('authenticated');

                // Identify user for analytics
                if (result.user) {
                    trackEvent('User_Login', {
                        email: email,
                        login_method: 'password',
                        user_id: result.user.id
                    });
                }

                // Start session tracking
                trackSessionStart(email);
            } else {
                trackRegistrationSuccess(email);
                trackEvent('Registration_Duration', { duration_ms: duration });

                showAuthStatus('Registration successful. Please log in with your new account.', 'success');

                // Track registration completion
                trackEvent('User_Registration_Complete', {
                    email: email,
                    registration_method: 'password'
                });
            }
        } catch (error) {
            console.error(`${action} error:`, error);
            showAuthStatus(`${action === 'login' ? 'Login' : 'Registration'} error: ${error.message}`, 'error');

            // Track failure
            if (action === 'login') {
                trackLoginFailure(email, error.message);
            } else {
                trackRegistrationFailure(email, error.message);
            }
        }
    }

    async function signOut() {
        try {
            // Track session end before signing out
            trackEvent('Session_End');

            // Call logout API
            await apiClient.logout();

            showAuthStatus('Logged out successfully', 'success');
            showUnauthenticatedUI();

            // Clear input fields
            systemPromptInput.value = '';
            emailInput.value = '';
            passwordInput.value = '';

            // Clear local storage
            await chrome.storage.local.remove(['systemPrompt', 'connectSystemPrompt', 'vercelAuthToken']);

            // Notify tabs about auth status change
            await notifyAuthStatusChange('unauthenticated');

            // Track sign out success
            trackEvent('Sign_Out_Success');

            // Reset tracking
            if (window.posthog) {
                window.posthog.reset();
            }
        } catch (error) {
            showAuthStatus('Logout error: ' + error.message, 'error');

            // Track sign out failure
            trackEvent('Sign_Out_Failure', { error: error.message });
        }
    }

    // Function to notify all LinkedIn tabs about auth status changes
    async function notifyAuthStatusChange(status) {
        try {
            const tabs = await chrome.tabs.query({ url: '*://*.linkedin.com/*' });
            for (const tab of tabs) {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'auth_status_changed',
                    status: status
                });
            }
        } catch (error) {
            console.error('Error notifying tabs:', error);
        }
    }

    function showAuthenticatedUI() {
        authForm.style.display = 'none';
        document.querySelectorAll('.authenticated').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.unauthenticated').forEach(el => el.style.display = 'none');
    }

    function showUnauthenticatedUI() {
        authForm.style.display = 'block';
        document.querySelectorAll('.authenticated').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.unauthenticated').forEach(el => el.style.display = 'block');
    }

    function showStatus(message, type) {
        // Use authStatus for all status messages
        showAuthStatus(message, type);
    }

    function showAuthStatus(message, type) {
        authStatus.textContent = message;
        authStatus.className = `status-message ${type}`;
        setTimeout(() => {
            authStatus.className = 'status-message';
        }, 3000);
    }
});