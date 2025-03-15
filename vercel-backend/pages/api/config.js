// Consolidated configuration endpoint for all API keys and settings
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

    // Get the configuration type from the query parameter
    const { type } = req.query;

    if (!type) {
        return res.status(400).json({ error: 'Configuration type is required' });
    }

    // Handle different configuration types
    switch (type) {
        case 'posthog':
            // Get PostHog configuration
            const posthogApiKey = process.env.POSTHOG_API_KEY;
            const posthogApiHost = process.env.POSTHOG_API_HOST;

            if (!posthogApiKey || !posthogApiHost) {
                return res.status(500).json({
                    error: 'PostHog configuration incomplete',
                    missing: {
                        key: !posthogApiKey,
                        host: !posthogApiHost
                    }
                });
            }

            return res.status(200).json({
                key: posthogApiKey,
                host: posthogApiHost
            });

        case 'stripe':
            // Get Stripe configuration
            const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
            const stripePriceId = process.env.STRIPE_PRO_PRICE_ID;
            const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
            const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

            // Check which specific Stripe config is requested
            const { field } = req.query;

            if (field === 'publishable-key') {
                if (!stripePublishableKey) {
                    return res.status(500).json({ error: 'Stripe publishable key not configured' });
                }
                return res.status(200).json({ key: stripePublishableKey });
            } else if (field === 'price-id') {
                if (!stripePriceId) {
                    return res.status(500).json({ error: 'Stripe price ID not configured' });
                }
                return res.status(200).json({ priceId: stripePriceId });
            } else if (field === 'secret-key') {
                if (!stripeSecretKey) {
                    return res.status(500).json({ error: 'Stripe secret key not configured' });
                }
                return res.status(200).json({ key: stripeSecretKey });
            } else if (field === 'webhook-secret') {
                if (!stripeWebhookSecret) {
                    return res.status(500).json({ error: 'Stripe webhook secret not configured' });
                }
                return res.status(200).json({ secret: stripeWebhookSecret });
            } else {
                // Return all Stripe configuration
                return res.status(200).json({
                    publishableKey: stripePublishableKey || null,
                    priceId: stripePriceId || null,
                    hasSecretKey: !!stripeSecretKey,
                    hasWebhookSecret: !!stripeWebhookSecret
                });
            }

        case 'supabase':
            // Get Supabase configuration
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

            // Check which specific Supabase config is requested
            const { subfield } = req.query;

            if (subfield === 'url') {
                if (!supabaseUrl) {
                    return res.status(500).json({ error: 'Supabase URL not configured' });
                }
                return res.status(200).json({ url: supabaseUrl });
            } else if (subfield === 'key') {
                if (!supabaseAnonKey) {
                    return res.status(500).json({ error: 'Supabase anon key not configured' });
                }
                return res.status(200).json({ key: supabaseAnonKey });
            } else {
                // Return all Supabase configuration
                return res.status(200).json({
                    url: supabaseUrl || null,
                    hasAnonKey: !!supabaseAnonKey,
                    hasServiceKey: !!supabaseServiceKey
                });
            }

        case 'anthropic':
            // Get Anthropic configuration
            const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

            if (!anthropicApiKey) {
                return res.status(500).json({ error: 'Anthropic API key not configured' });
            }

            return res.status(200).json({ key: anthropicApiKey });

        default:
            return res.status(400).json({ error: `Unknown configuration type: ${type}` });
    }
}