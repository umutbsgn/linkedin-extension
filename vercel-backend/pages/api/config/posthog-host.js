// API endpoint for PostHog API host
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

    // Get the PostHog API host from environment variables
    const posthogApiHost = process.env.POSTHOG_API_HOST;

    if (!posthogApiHost) {
        return res.status(500).json({ error: 'PostHog API host not configured' });
    }

    // Return the PostHog API host
    return res.status(200).json({ host: posthogApiHost });
}