// Consolidated API endpoint for PostHog configuration
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

    // Get the PostHog configuration from environment variables
    const posthogApiKey = process.env.POSTHOG_API_KEY;
    const posthogApiHost = process.env.POSTHOG_API_HOST;

    // Check if both values are available
    if (!posthogApiKey || !posthogApiHost) {
        return res.status(500).json({
            error: 'PostHog configuration incomplete',
            missing: {
                key: !posthogApiKey,
                host: !posthogApiHost
            }
        });
    }

    // Return the complete PostHog configuration
    return res.status(200).json({
        key: posthogApiKey,
        host: posthogApiHost
    });
}