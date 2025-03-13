// API endpoint for retrieving subscription status
import { initSupabase, verifyToken, getUserSubscriptionType, getSubscriptionData } from './utils';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
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

        // Get subscription type and details
        const subscriptionType = await getUserSubscriptionType(supabase, userId);
        const subscriptionData = await getSubscriptionData(supabase, userId);

        // Check API key settings
        const useOwnApiKey = subscriptionData && subscriptionData.use_own_api_key && subscriptionData.own_api_key;

        // Return subscription status
        return res.status(200).json({
            subscriptionType,
            hasActiveSubscription: !!subscriptionData,
            useOwnApiKey: !!useOwnApiKey,
            apiKey: useOwnApiKey ? subscriptionData.own_api_key : null,
            subscription: subscriptionData ? {
                id: subscriptionData.stripe_subscription_id,
                status: subscriptionData.status,
                currentPeriodStart: subscriptionData.current_period_start,
                currentPeriodEnd: subscriptionData.current_period_end
            } : null
        });
    } catch (error) {
        console.error('Error getting subscription status:', error);
        return res.status(500).json({ error: error.message });
    }
}