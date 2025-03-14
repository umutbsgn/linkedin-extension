// API endpoint for Supabase key
export default function handler(req, res) {
    // Set CORS headers to allow requests from any origin
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

    // Get the Supabase key from environment variables
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseKey) {
        return res.status(500).json({ error: 'Supabase key not configured' });
    }

    // Return the Supabase key
    return res.status(200).json({ key: supabaseKey });
}