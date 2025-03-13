// Utility functions for subscription endpoints
import { createClient } from '@supabase/supabase-js';

// Get Stripe secret key from the server
export async function getStripeSecretKey() {
    try {
        const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/config/stripe-secret-key`, {
            headers: {
                'Host': process.env.VERCEL_URL ? `${process.env.VERCEL_URL}` : 'localhost:3000'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get Stripe secret key: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.key;
    } catch (error) {
        console.error('Error getting Stripe secret key:', error);
        throw error;
    }
}

// Get Stripe price ID from the server
export async function getStripePriceId() {
    try {
        const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/config/stripe-price-id`, {
            headers: {
                'Host': process.env.VERCEL_URL ? `${process.env.VERCEL_URL}` : 'localhost:3000'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get Stripe price ID: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.priceId;
    } catch (error) {
        console.error('Error getting Stripe price ID:', error);
        throw error;
    }
}

// Get Stripe webhook secret from the server
export async function getStripeWebhookSecret() {
    try {
        const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/config/stripe-webhook-secret`, {
            headers: {
                'Host': process.env.VERCEL_URL ? `${process.env.VERCEL_URL}` : 'localhost:3000'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get Stripe webhook secret: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.secret;
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