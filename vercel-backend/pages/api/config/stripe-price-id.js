// API endpoint for Stripe price ID
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

    // Get the Stripe price ID from environment variables
    const stripePriceId = process.env.STRIPE_PRO_PRICE_ID;

    if (!stripePriceId) {
        return res.status(500).json({ error: 'Stripe price ID not configured' });
    }

    // Return the Stripe price ID
    return res.status(200).json({ priceId: stripePriceId });
}