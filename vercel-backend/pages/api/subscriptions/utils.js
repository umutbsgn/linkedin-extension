// Utility functions for subscription endpoints
import { createClient } from '@supabase/supabase-js';

// Get Stripe secret key directly from environment variables
export async function getStripeSecretKey() {
    try {
        // Get the key directly from environment variables
        const key = process.env.STRIPE_SECRET_KEY;

        if (!key) {
            throw new Error('Stripe secret key not configured in environment variables');
        }

        return key;
    } catch (error) {
        console.error('Error getting Stripe secret key:', error);
        throw error;
    }
}

// Get Stripe price ID directly from environment variables
export async function getStripePriceId() {
    try {
        // Get the price ID directly from environment variables
        const priceId = process.env.STRIPE_PRO_PRICE_ID;

        if (!priceId) {
            throw new Error('Stripe price ID not configured in environment variables');
        }

        return priceId;
    } catch (error) {
        console.error('Error getting Stripe price ID:', error);
        throw error;
    }
}

// Get Stripe webhook secret directly from environment variables
export async function getStripeWebhookSecret() {
    try {
        // Get the webhook secret directly from environment variables
        const secret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!secret) {
            throw new Error('Stripe webhook secret not configured in environment variables');
        }

        return secret;
    } catch (error) {
        console.error('Error getting Stripe webhook secret:', error);
        throw error;
    }
}

// Initialize Supabase client
export function initSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
    }

    return createClient(supabaseUrl, supabaseKey);
}

// Get user subscription type
export async function getUserSubscriptionType(supabase, userId) {
    try {
        const { data, error } = await supabase
            .from('user_subscriptions')
            .select('subscription_type')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error('Error getting user subscription type:', error);
            return 'trial'; // Default to trial if error
        }

        return (data && data.subscription_type) || 'trial';
    } catch (error) {
        console.error('Error getting user subscription type:', error);
        return 'trial'; // Default to trial if error
    }
}

// Get user subscription data
export async function getSubscriptionData(supabase, userId) {
    try {
        const { data, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error('Error getting subscription data:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error getting subscription data:', error);
        return null;
    }
}

// Verify Supabase token and get user ID
export async function verifyToken(supabase, token) {
    try {
        const { data, error } = await supabase.auth.getUser(token);

        if (error) {
            throw error;
        }

        return data.user;
    } catch (error) {
        console.error('Error verifying token:', error);
        throw new Error('Invalid or expired token');
    }
}