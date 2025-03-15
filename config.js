// Configuration for the LinkedIn AI Assistant browser extension

// Vercel backend URL
export const VERCEL_BACKEND_URL = 'https://linkedin-extension-seven.vercel.app';

// API endpoints
export const API_ENDPOINTS = {
    // Base URL
    VERCEL_BACKEND_URL: VERCEL_BACKEND_URL,

    // Anthropic
    ANALYZE: `${VERCEL_BACKEND_URL}/api/anthropic/analyze`,

    // Auth - using existing Supabase endpoints
    LOGIN: `${VERCEL_BACKEND_URL}/api/supabase/auth/login`,
    REGISTER: `${VERCEL_BACKEND_URL}/api/supabase/auth/signup`,
    LOGOUT: `${VERCEL_BACKEND_URL}/api/supabase/auth/logout`,

    // User - using existing Supabase endpoints
    USER_PROFILE: `${VERCEL_BACKEND_URL}/api/supabase/user-settings`,
    USER_SETTINGS: `${VERCEL_BACKEND_URL}/api/supabase/user-settings`,

    // API Usage
    USAGE: `${VERCEL_BACKEND_URL}/api/usage`,

    // Analytics
    TRACK: `${VERCEL_BACKEND_URL}/api/analytics/track`,

    // PostHog Configuration - consolidated endpoint
    POSTHOG_CONFIG: `${VERCEL_BACKEND_URL}/api/config/posthog`,

    // Stripe Configuration
    STRIPE_PUBLISHABLE_KEY: `${VERCEL_BACKEND_URL}/api/config/stripe-publishable-key`,
    STRIPE_PRICE_ID: `${VERCEL_BACKEND_URL}/api/config/stripe-price-id`,

    // Subscription Management
    SUBSCRIPTION_STATUS: `${VERCEL_BACKEND_URL}/api/subscriptions/status`,
    CREATE_CHECKOUT: `${VERCEL_BACKEND_URL}/api/subscriptions/create-checkout`,
    CANCEL_SUBSCRIPTION: `${VERCEL_BACKEND_URL}/api/subscriptions/cancel`,
    UPDATE_API_KEY: `${VERCEL_BACKEND_URL}/api/subscriptions/update-api-key`,
    REDIRECT: `${VERCEL_BACKEND_URL}/api/subscriptions/redirect`
};