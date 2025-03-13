// API endpoint for creating a Stripe checkout session
import Stripe from 'stripe';
import { getStripeSecretKey, getStripePriceId, initSupabase, verifyToken } from './utils';

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

        // Get success and cancel URLs from request
        const { successUrl, cancelUrl } = req.body;

        if (!successUrl || !cancelUrl) {
            return res.status(400).json({ error: 'Success and cancel URLs are required' });
        }

        // Get Stripe configuration
        const stripeSecretKey = await getStripeSecretKey();
        const stripePriceId = await getStripePriceId();

        // Initialize Stripe
        const stripe = new Stripe(stripeSecretKey);

        // Check if user already has an active subscription
        const { data: existingSubscription } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .limit(1);

        if (existingSubscription && existingSubscription.length > 0) {
            return res.status(400).json({
                error: 'User already has an active subscription',
                subscription: existingSubscription[0]
            });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: stripePriceId,
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: userId,
            customer_email: user.email,
            metadata: { userId: userId, email: user.email }
        });

        // Return session details
        return res.status(200).json({
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        return res.status(500).json({ error: error.message });
    }
}