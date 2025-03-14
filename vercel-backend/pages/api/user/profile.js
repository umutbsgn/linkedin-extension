// User profile endpoint
import { createClient } from '@supabase/supabase-js';
import authMiddleware from '../middleware/auth';

// Handler function for the user profile endpoint
async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get user ID from the authenticated request
        const userId = req.user.userId;

        // Initialize Supabase client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Supabase configuration missing' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user profile from Supabase
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, role, created_at, updated_at')
            .eq('id', userId)
            .single();

        if (userError) {
            console.error('Error fetching user profile:', userError);
            return res.status(500).json({ error: 'Error fetching user profile' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return user profile
        return res.status(200).json(user);
    } catch (error) {
        console.error('Error in user profile endpoint:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Wrap the handler with the auth middleware
export default authMiddleware(handler);