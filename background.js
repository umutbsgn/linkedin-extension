import { getPostHogApiKey, getPostHogApiHost, fetchPostHogConfig } from './popup/analytics.js';
import { API_ENDPOINTS } from './config.js';
import apiClient from './popup/api-client.js';

// Initialize PostHog configuration
let posthogApiKey = '';
let posthogApiHost = '';

// Fetch PostHog configuration
async function initPostHogConfig() {
    try {
        const config = await fetchPostHogConfig();
        posthogApiKey = config.posthogApiKey;
        posthogApiHost = config.posthogApiHost;
        console.log('PostHog configuration initialized in background script');
    } catch (error) {
        console.error('Error initializing PostHog configuration:', error);
    }
}

// Initialize PostHog configuration
initPostHogConfig();

// Direct implementation of trackEvent for background script
async function trackEvent(eventName, properties = {}) {
    // Handle specific event types directly
    if (eventName === 'post_comment' || eventName === 'connection_message') {
        // Keep the event name as is
        properties = {
            ...properties,
            button_type: eventName // Add button_type property
        };
    } else if (eventName === 'Autocapture') {
        // Keep as Autocapture, no changes needed
    }
    // Only track events that are in the active tracked events list
    else if (eventName !== 'post_comment' && eventName !== 'connection_message' &&
        eventName !== 'API_Call' && eventName !== 'API_Call_Success' && eventName !== 'API_Call_Failure' &&
        eventName !== 'Extension_Installed' && eventName !== 'Extension_Updated' &&
        eventName !== 'Login_Attempt' && eventName !== 'Login_Success' &&
        eventName !== 'Session_End' && eventName !== 'Analyze_Text_Attempt' &&
        eventName !== 'Analyze_Text_Success' && eventName !== 'Pageleave' &&
        eventName !== 'Session_Start' && eventName !== 'Login_Duration' &&
        eventName !== 'Rageclick' && eventName !== 'Sign_Out_Success' &&
        eventName !== 'Pageview' && eventName !== 'Login_Failure' &&
        eventName !== 'Registration_Failure' && eventName !== 'Registration_Attempt') {

        // Skip tracking for unknown events
        console.log(`Skipping unknown event: ${eventName}`);
        return;
    }

    const eventProperties = {
        timestamp: new Date().toISOString(),
        context: 'background',
        ...properties
    };

    // Try to get user information from API client
    let userId = 'anonymous_user';
    try {
        const isAuthenticated = await apiClient.isAuthenticated();
        if (isAuthenticated) {
            const userProfile = await apiClient.getUserProfile();
            if (userProfile && userProfile.email) {
                userId = userProfile.email;
                console.log('Using user email for tracking:', userId);
            }
        }
    } catch (error) {
        console.error('Error getting user information for tracking:', error);
    }

    // Send to Vercel backend instead of directly to PostHog
    try {
        fetch(API_ENDPOINTS.TRACK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                eventName: eventName,
                properties: eventProperties,
                distinctId: userId
            })
        }).catch(error => {
            console.error(`Error sending event to tracking endpoint: ${error}`);

            // Fallback: Send directly to PostHog if Vercel endpoint fails
            if (posthogApiKey && posthogApiHost) {
                fetch(`${posthogApiHost}/capture/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        api_key: posthogApiKey,
                        event: eventName,
                        properties: eventProperties,
                        distinct_id: userId,
                        timestamp: new Date().toISOString()
                    })
                }).catch(innerError => {
                    console.error(`Error sending event directly to PostHog: ${innerError}`);
                });
            }
        });

        console.log(`Event tracked via Vercel backend: ${eventName}`, eventProperties);
    } catch (error) {
        console.error(`Error tracking event ${eventName}:`, error);
    }
}

// Function to call Anthropic API
async function callAnthropicAPI(prompt, systemPrompt) {
    const startTime = Date.now();

    // Track API call
    trackEvent('API_Call', {
        endpoint: 'anthropic_messages',
        prompt_length: prompt.length,
        system_prompt_length: systemPrompt ? systemPrompt.length : 0
    });

    try {
        // Use the API client to make the request
        const data = await apiClient.analyzeText(prompt, systemPrompt);
        const responseSize = JSON.stringify(data).length;
        const responseTime = Date.now() - startTime;

        // Track API call success
        trackEvent('API_Call_Success', {
            endpoint: 'anthropic_messages',
            response_time_ms: responseTime,
            response_size_bytes: responseSize,
            content_length: data.content && data.content[0] && data.content[0].text && data.content[0].text.length || 0
        });

        return data;
    } catch (error) {
        console.error('API Call Error:', error);
        const responseTime = Date.now() - startTime;

        // Track API call error
        trackEvent('API_Call_Failure', {
            endpoint: 'anthropic_messages',
            error: error.message,
            response_time_ms: responseTime
        });

        throw error;
    }
}

// Default connect system prompt for CONNECT
const DEFAULT_CONNECT_SYSTEM_PROMPT = 'You are a LinkedIn connection request assistant. Your task is to analyze the recipient\'s profile and craft a personalized, concise connection message. Keep it friendly, professional, and highlight a shared interest or mutual benefit. Maximum 160 characters.';

// Function to get user settings
async function getUserSettings() {
    try {
        // Check if user is authenticated
        const isAuthenticated = await apiClient.isAuthenticated();
        if (!isAuthenticated) {
            throw new Error('User not authenticated');
        }

        // Get user settings
        return await apiClient.getUserSettings();
    } catch (error) {
        console.error('Error getting user settings:', error);
        throw error;
    }
}

// Function to get comment system prompt
async function getCommentSystemPrompt() {
    try {
        const settings = await getUserSettings();
        return settings.system_prompt;
    } catch (error) {
        console.error('Error fetching comment system prompt:', error);
        throw error;
    }
}

// Function to get connect system prompt
async function getConnectSystemPrompt() {
    try {
        const settings = await getUserSettings();
        if (settings && settings.connect_system_prompt) {
            console.log('Retrieved connect system prompt:', settings.connect_system_prompt);
            return settings.connect_system_prompt;
        } else {
            console.log('No custom connect system prompt found, using default');
            return DEFAULT_CONNECT_SYSTEM_PROMPT;
        }
    } catch (error) {
        console.error('Error fetching connect system prompt:', error);
        console.log('Using default connect system prompt due to error');
        return DEFAULT_CONNECT_SYSTEM_PROMPT;
    }
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyze") {
        callAnthropicAPI(request.text, request.systemPrompt)
            .then(response => sendResponse({ success: true, data: response }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Indicates an asynchronous response
    } else if (request.action === "login") {
        apiClient.login(request.email, request.password)
            .then(response => sendResponse({ success: true, data: response }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    } else if (request.action === "register") {
        apiClient.register(request.email, request.password)
            .then(response => sendResponse({ success: true, data: response }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    } else if (request.action === "logout") {
        apiClient.logout()
            .then(response => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    } else if (request.action === "getCommentSystemPrompt") {
        getCommentSystemPrompt()
            .then(systemPromptComments => sendResponse({ systemPromptComments }))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    } else if (request.action === "getConnectSystemPrompt") {
        getConnectSystemPrompt()
            .then(systemPromptConnect => sendResponse({ systemPromptConnect }))
            .catch(error => {
                console.error('Error in getConnectSystemPrompt:', error);
                sendResponse({ systemPromptConnect: DEFAULT_CONNECT_SYSTEM_PROMPT });
            });
        return true;
    } else if (request.action === "trackEvent") {
        // Handle tracking events from content script
        trackEvent(request.eventName, request.properties)
            .then(() => sendResponse({ success: true }))
            .catch(error => {
                console.error('Error handling trackEvent:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === "posthog_track") {
        // This is a special case for background script tracking
        (async() => {
            try {
                // Handle specific event types directly
                if (request.eventName === 'post_comment' || request.eventName === 'connection_message') {
                    // Use trackEvent directly with the specific event name
                    await trackEvent(request.eventName, request.properties);
                }
                // Prioritize Autocapture
                else if (request.eventName === 'Autocapture') {
                    // Use trackEvent directly
                    await trackEvent('Autocapture', request.properties);
                }
                // For other events, map to post_comment (preferred)
                else {
                    const mappedProperties = {
                        ...request.properties,
                        original_event: request.eventName
                    };

                    await trackEvent('post_comment', mappedProperties);
                }

                sendResponse({ success: true });
            } catch (error) {
                console.error('Error handling posthog_track:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }
});

// Track extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        trackEvent('Extension_Installed', {
            version: chrome.runtime.getManifest().version
        });
    } else if (details.reason === 'update') {
        trackEvent('Extension_Updated', {
            previous_version: details.previousVersion,
            current_version: chrome.runtime.getManifest().version
        });
    }
});

// Initialize API client
apiClient.initialize().catch(error => {
    console.error('Error initializing API client:', error);
});