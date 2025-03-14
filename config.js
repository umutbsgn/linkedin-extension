// Configuration for the LinkedIn AI Assistant browser extension

// Vercel backend URL (change this to your deployed Vercel app URL)
export const VERCEL_BACKEND_URL = 'https://linkedin-extension-j5wswgs0v-umutbsgns-projects.vercel.app';

// API endpoints
export const API_ENDPOINTS = {
    // Anthropic
    ANALYZE: `${VERCEL_BACKEND_URL}/api/anthropic/analyze`,
    ANTHROPIC_API_KEY: `${VERCEL_BACKEND_URL}/api/config/anthropic-key`,

    // Supabase Auth
    LOGIN: `${VERCEL_BACKEND_URL}/api/supabase/auth/login`,
    SIGNUP: `${VERCEL_BACKEND_URL}/api/supabase/auth/signup`,

    // Supabase Data
    USER_SETTINGS: `${VERCEL_BACKEND_URL}/api/supabase/user-settings`,
    BETA_ACCESS: `${VERCEL_BACKEND_URL}/api/supabase/beta-access`,

    // Supabase Configuration
    SUPABASE_URL: `${VERCEL_BACKEND_URL}/api/config/supabase-url`,
    SUPABASE_KEY: `${VERCEL_BACKEND_URL}/api/config/supabase-key`,

    // Analytics
    TRACK: `${VERCEL_BACKEND_URL}/api/analytics/track`,

    // PostHog Configuration
    POSTHOG_API_KEY: `${VERCEL_BACKEND_URL}/api/config/posthog-key`,
    POSTHOG_API_HOST: `${VERCEL_BACKEND_URL}/api/config/posthog-host`,

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