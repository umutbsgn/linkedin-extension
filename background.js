import { createClient } from './popup/supabase-client.js';
import { getPostHogApiKey, getPostHogApiHost, fetchPostHogConfig } from './popup/analytics.js';
import { API_ENDPOINTS, getApiEndpoint } from './config.js';

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

    // Try to get the user's email from Supabase to use as distinct_id
    let userEmail = null;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            userEmail = session.user.email;
            console.log('Using user email for tracking:', userEmail);
        }
    } catch (error) {
        console.error('Error getting user email:', error);
    }

    // Send directly to PostHog API
    try {
        // Get the current PostHog API key and host
        const apiKey = getPostHogApiKey() || posthogApiKey;
        const apiHost = getPostHogApiHost() || posthogApiHost;

        // If we don't have the API key or host, try to fetch them
        if (!apiKey || !apiHost) {
            console.log('PostHog configuration not available, fetching...');
            const config = await fetchPostHogConfig();
            posthogApiKey = config.posthogApiKey;
            posthogApiHost = config.posthogApiHost;
        }

        // Check if we have the API key and host
        if (!posthogApiKey || !posthogApiHost) {
            console.error('PostHog configuration not available, skipping event tracking');
            return;
        }

        fetch(`${posthogApiHost}/capture/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: posthogApiKey,
                event: eventName,
                properties: eventProperties,
                distinct_id: userEmail || 'anonymous_user', // Use email if available, otherwise anonymous
                timestamp: new Date().toISOString()
            })
        }).catch(error => {
            console.error(`Error sending event to PostHog: ${error}`);
        });

        console.log(`Event tracked directly from background: ${eventName}`, eventProperties);
    } catch (error) {
        console.error(`Error tracking event ${eventName}:`, error);
    }
}

import { API_ENDPOINTS } from './config.js';

// Initialize with empty values, will be fetched from the server
let supabaseUrl = '';
let supabaseKey = '';
let supabase = null;

// Fetch Supabase configuration from the server
async function fetchSupabaseConfig() {
    try {
        // Fetch Supabase URL
        const supabaseUrlEndpoint = await getApiEndpoint(API_ENDPOINTS.SUPABASE_URL);
        const urlResponse = await fetch(supabaseUrlEndpoint);
        if (urlResponse.ok) {
            const urlData = await urlResponse.json();
            supabaseUrl = urlData.url;
        } else {
            console.error('Failed to fetch Supabase URL:', urlResponse.status, urlResponse.statusText);
        }

        // Fetch Supabase key
        const supabaseKeyEndpoint = await getApiEndpoint(API_ENDPOINTS.SUPABASE_KEY);
        const keyResponse = await fetch(supabaseKeyEndpoint);
        if (keyResponse.ok) {
            const keyData = await keyResponse.json();
            supabaseKey = keyData.key;
        } else {
            console.error('Failed to fetch Supabase key:', keyResponse.status, keyResponse.statusText);
        }

        // Initialize Supabase client if both URL and key are available
        if (supabaseUrl && supabaseKey) {
            supabase = createClient(supabaseUrl, supabaseKey);
            console.log('Supabase client initialized with configuration from server');
        } else {
            console.error('Failed to initialize Supabase client: missing URL or key');
        }

        return { supabaseUrl, supabaseKey };
    } catch (error) {
        console.error('Error fetching Supabase configuration:', error);
        return { supabaseUrl: '', supabaseKey: '' };
    }
}

// Initialize Supabase client
fetchSupabaseConfig();

async function callAnthropicAPI(prompt, systemPrompt) {
    const startTime = Date.now();

    // Track API call
    trackEvent('API_Call', {
        endpoint: 'anthropic_messages',
        prompt_length: prompt.length,
        system_prompt_length: systemPrompt ? systemPrompt.length : 0
    });

    try {
        const analyzeEndpoint = await getApiEndpoint(API_ENDPOINTS.ANALYZE);
        const response = await fetch(analyzeEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: prompt,
                systemPrompt: systemPrompt
            })
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || response.statusText;

            // Track API call failure
            trackEvent('API_Call_Failure', {
                endpoint: 'anthropic_messages',
                error: errorMessage,
                status_code: response.status,
                response_time_ms: responseTime
            });

            // Special handling for 503 Service Unavailable (which may be due to Anthropic 529 Overloaded)
            if (response.status === 503 && errorMessage.includes("high demand")) {
                throw new Error("The AI service is currently experiencing high demand. Please try again in a few moments.");
            }

            throw new Error(`API call failed: ${response.status} - ${errorMessage}`);
        }

        const data = await response.json();
        const responseSize = JSON.stringify(data).length;

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

        // Track API call error if not already tracked
        if (!error.message.includes('API call failed:')) {
            trackEvent('API_Call_Failure', {
                endpoint: 'anthropic_messages',
                error: error.message,
                response_time_ms: Date.now() - startTime
            });
        }

        throw error;
    }
}

// Default connect system prompt for CONNECT
const DEFAULT_CONNECT_SYSTEM_PROMPT = 'You are a LinkedIn connection request assistant. Your task is to analyze the recipient\'s profile and craft a personalized, concise connection message. Keep it friendly, professional, and highlight a shared interest or mutual benefit. Maximum 160 characters.';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyze") {
        callAnthropicAPI(request.text, request.systemPrompt)
            .then(response => sendResponse({ success: true, data: response }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Indicates an asynchronous response
    } else if (request.action === "storeSupabaseToken") {
        chrome.storage.local.set({ supabaseAuthToken: request.token }, () => {
            sendResponse({ success: true });
        });
        return true;
    } else if (request.action === "getSupabaseToken") {
        chrome.storage.local.get('supabaseAuthToken', (result) => {
            sendResponse({ token: result.supabaseAuthToken });
        });
        return true;
    } else if (request.action === 'getCommentSystemPrompt') {
        getCommentSystemPrompt()
            .then(systemPromptComments => sendResponse({ systemPromptComments }))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Indicates an asynchronous response
    } else if (request.action === 'getConnectSystemPrompt') {
        getConnectSystemPrompt()
            .then(systemPromptConnect => sendResponse({ systemPromptConnect }))
            .catch(error => {
                console.error('Error in getConnectSystemPrompt:', error);
                sendResponse({ systemPromptConnect: DEFAULT_CONNECT_SYSTEM_PROMPT });
            });
        return true; // Indicates an asynchronous response
    } else if (request.action === 'trackEvent') {
        // Handle tracking events from content script
        trackEvent(request.eventName, request.properties)
            .then(() => sendResponse({ success: true }))
            .catch(error => {
                console.error('Error handling trackEvent:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Indicates an asynchronous response
    } else if (request.action === 'posthog_track') {
        // This is a special case for background script tracking
        // Forward to popup for actual tracking in PostHog
        (async() => {
            try {
                // Handle specific event types directly
                if (request.eventName === 'post_comment' || request.eventName === 'connection_message') {
                    // Use trackEvent directly with the specific event name
                    await trackEvent(request.eventName, request.properties);
                    // No forwarding to popup to avoid loops
                }
                // Prioritize Autocapture
                else if (request.eventName === 'Autocapture') {
                    // Use trackEvent directly
                    await trackEvent('Autocapture', request.properties);
                    // No forwarding to popup to avoid loops
                }
                // For other events, map to post_comment (preferred)
                else {
                    const mappedProperties = {
                        ...request.properties,
                        original_event: request.eventName
                    };

                    await trackEvent('post_comment', mappedProperties);
                    // No forwarding to popup to avoid loops
                }

                sendResponse({ success: true });
            } catch (error) {
                console.error('Error forwarding posthog_track:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Indicates an asynchronous response
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

async function getCommentSystemPrompt() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('No active session');
        }
        const userId = session.user.id;
        const { data, error } = await supabase
            .from('user_settings')
            .select('system_prompt')
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data.system_prompt;
    } catch (error) {
        console.error('Error fetching comment system prompt:', error);
        throw error;
    }
}

async function getConnectSystemPrompt() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('No active session');
        }
        const userId = session.user.id;
        const { data, error } = await supabase
            .from('user_settings')
            .select('connect_system_prompt')
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        if (data && data.connect_system_prompt) {
            console.log('Retrieved connect system prompt from Supabase:', data.connect_system_prompt);
            return data.connect_system_prompt;
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

// Initialize Supabase session
chrome.runtime.onInstalled.addListener(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            chrome.storage.local.set({ supabaseAuthToken: session.access_token });
        }
    });
});