// API endpoint for canceling a subscription
import Stripe from 'stripe';
import { getStripeSecretKey, initSupabase, verifyToken } from './utils';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get authorization token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];

        // Initialize Supabase
        const supabase = initSupabase();

        // Verify token and get user
        const user = await verifyToken(supabase, token);
        const userId = user.id;

        // Get user's active subscription
        const { data: subscriptionData, error: subscriptionError } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (subscriptionError || !subscriptionData) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        const subscriptionId = subscriptionData.stripe_subscription_id;

        // Get Stripe configuration
        const stripeSecretKey = await getStripeSecretKey();

        // Initialize Stripe
        const stripe = new Stripe(stripeSecretKey);

        // Cancel subscription at period end
        await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
        });

        // Update subscription status in database
        const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({
                status: 'canceling',
                updated_at: new Date().toISOString()
            })
            .eq('id', subscriptionData.id);

        if (updateError) {
            console.error('Error updating subscription status:', updateError);
            return res.status(500).json({ error: 'Failed to update subscription status' });
        }

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'Subscription will be canceled at the end of the current billing period',
            subscription: {
                id: subscriptionId,
                status: 'canceling',
                currentPeriodEnd: subscriptionData.current_period_end
            }
        });
    } catch (error) {
        console.error('Error canceling subscription:', error);
        return res.status(500).json({ error: error.message });
    }
}