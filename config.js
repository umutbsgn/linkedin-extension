// Configuration for the LinkedIn AI Assistant browser extension

// Default Vercel backend URL (will be overridden by the value in Chrome storage if available)
const DEFAULT_VERCEL_BACKEND_URL = 'https://linkedin-extension-j5wswgs0v-umutbsgns-projects.vercel.app';

// Get the Vercel backend URL from Chrome storage or use the default
export const getVercelBackendUrl = async() => {
    try {
        const result = await chrome.storage.local.get(['vercelBackendUrl']);
        return result.vercelBackendUrl || DEFAULT_VERCEL_BACKEND_URL;
    } catch (error) {
        console.error('Error getting Vercel backend URL from storage:', error);
        return DEFAULT_VERCEL_BACKEND_URL;
    }
};

// Set the Vercel backend URL in Chrome storage
export const setVercelBackendUrl = async(url) => {
    try {
        await chrome.storage.local.set({ vercelBackendUrl: url });
        console.log('Vercel backend URL saved to storage:', url);
        return true;
    } catch (error) {
        console.error('Error saving Vercel backend URL to storage:', error);
        return false;
    }
};

// Function to get the full URL for an API endpoint
export const getApiEndpoint = async(endpoint) => {
    const baseUrl = await getVercelBackendUrl();
    return `${baseUrl}${endpoint}`;
};

// API endpoints paths - these will be combined with the base URL when needed
export const API_ENDPOINTS = {
    // Anthropic
    ANALYZE: '/api/anthropic/analyze',
    ANTHROPIC_API_KEY: '/api/config/anthropic-key',

    // Supabase Auth
    LOGIN: '/api/supabase/auth/login',
    SIGNUP: '/api/supabase/auth/signup',

    // Supabase Data
    USER_SETTINGS: '/api/supabase/user-settings',
    BETA_ACCESS: '/api/supabase/beta-access',

    // Supabase Configuration
    SUPABASE_URL: '/api/config/supabase-url',
    SUPABASE_KEY: '/api/config/supabase-key',

    // Analytics
    TRACK: '/api/analytics/track',

    // PostHog Configuration
    POSTHOG_API_KEY: '/api/config/posthog-key',
    POSTHOG_API_HOST: '/api/config/posthog-host',

    // Stripe Configuration
    STRIPE_PUBLISHABLE_KEY: '/api/config/stripe-publishable-key',
    STRIPE_PRICE_ID: '/api/config/stripe-price-id',

    // Subscription Management
    SUBSCRIPTION_STATUS: '/api/subscriptions/status',
    CREATE_CHECKOUT: '/api/subscriptions/create-checkout',
    CANCEL_SUBSCRIPTION: '/api/subscriptions/cancel',
    UPDATE_API_KEY: '/api/subscriptions/update-api-key',
    REDIRECT: '/api/subscriptions/redirect'
};