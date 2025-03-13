// API endpoint for updating API key settings
import { initSupabase, verifyToken } from './utils';

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

        // Get API key settings from request
        const { useOwnApiKey, apiKey } = req.body;

        if (typeof useOwnApiKey !== 'boolean') {
            return res.status(400).json({ error: 'useOwnApiKey must be a boolean' });
        }

        // If using own API key, validate it
        if (useOwnApiKey && (!apiKey || typeof apiKey !== 'string')) {
            return res.status(400).json({ error: 'API key is required when useOwnApiKey is true' });
        }

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

        // Update API key settings
        const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({
                use_own_api_key: useOwnApiKey,
                own_api_key: useOwnApiKey ? apiKey : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', subscriptionData.id);

        if (updateError) {
            console.error('Error updating API key settings:', updateError);
            return res.status(500).json({ error: 'Failed to update API key settings' });
        }

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'API key settings updated successfully',
            settings: {
                useOwnApiKey,
                apiKey: useOwnApiKey ? apiKey : null
            }
        });
    } catch (error) {
        console.error('Error updating API key settings:', error);
        return res.status(500).json({ error: error.message });
    }
}