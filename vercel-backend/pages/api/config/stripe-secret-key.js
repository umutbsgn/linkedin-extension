// API endpoint for Stripe secret key (server-side only)
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

    // Only allow server-side access with host validation
    const host = req.headers.host || '';
    if (!host.includes('vercel.app') && !host.includes('localhost')) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Get the Stripe secret key from environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
        return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    // Return the Stripe secret key
    return res.status(200).json({ key: stripeSecretKey });
}