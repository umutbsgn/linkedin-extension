// Debug endpoint to check environment variables
export default function handler(req, res) {
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

    // Check environment variables
    const variables = {
        'SUPABASE_URL': process.env.SUPABASE_URL ? '✓' : '✗',
        'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY ? '✓' : '✗',
        'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY ? '✓' : '✗',
        'POSTHOG_API_KEY': process.env.POSTHOG_API_KEY ? '✓' : '✗',
        'POSTHOG_API_HOST': process.env.POSTHOG_API_HOST ? '✓' : '✗',
        'ANTHROPIC_API_KEY': process.env.ANTHROPIC_API_KEY ? '✓' : '✗',
        'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY ? '✓' : '✗',
        'STRIPE_PUBLISHABLE_KEY': process.env.STRIPE_PUBLISHABLE_KEY ? '✓' : '✗',
        'STRIPE_PRO_PRICE_ID': process.env.STRIPE_PRO_PRICE_ID ? '✓' : '✗',
        'STRIPE_WEBHOOK_SECRET': process.env.STRIPE_WEBHOOK_SECRET ? '✓' : '✗'
    };

    const missingVariables = Object.entries(variables)
        .filter(([_, value]) => value === '✗')
        .map(([key]) => key);

    // Return the result
    return res.status(200).json({
        variables,
        missingVariables,
        allVariablesPresent: missingVariables.length === 0
    });
}