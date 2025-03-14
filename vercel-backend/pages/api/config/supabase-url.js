// API endpoint for Supabase URL
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

    // Get the Supabase URL from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!supabaseUrl) {
        return res.status(500).json({ error: 'Supabase URL not configured' });
    }

    // Return the Supabase URL
    return res.status(200).json({ url: supabaseUrl });
}