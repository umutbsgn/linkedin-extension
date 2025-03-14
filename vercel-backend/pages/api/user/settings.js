// User settings endpoint
import { createClient } from '@supabase/supabase-js';
import authMiddleware from '../middleware/auth';

// Handler function for the user settings endpoint
async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Get user ID from the authenticated request
    const userId = req.user.userId;

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle GET request (get user settings)
    if (req.method === 'GET') {
        try {
            // Get user settings from Supabase
            const { data: settings, error: settingsError } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
                console.error('Error fetching user settings:', settingsError);
                return res.status(500).json({ error: 'Error fetching user settings' });
            }

            // If no settings found, return empty object
            if (!settings) {
                return res.status(200).json({});
            }

            // Return user settings
            return res.status(200).json(settings);
        } catch (error) {
            console.error('Error in GET user settings:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Handle POST request (update user settings)
    if (req.method === 'POST') {
        try {
            const settings = req.body;

            // Validate settings
            if (!settings || typeof settings !== 'object') {
                return res.status(400).json({ error: 'Invalid settings data' });
            }

            // Add user_id and updated_at to settings
            const updatedSettings = {
                ...settings,
                user_id: userId,
                updated_at: new Date().toISOString()
            };

            // Check if settings already exist
            const { data: existingSettings, error: checkError } = await supabase
                .from('user_settings')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking existing settings:', checkError);
                return res.status(500).json({ error: 'Error checking existing settings' });
            }

            let result;

            // If settings exist, update them
            if (existingSettings) {
                const { data, error: updateError } = await supabase
                    .from('user_settings')
                    .update(updatedSettings)
                    .eq('user_id', userId)
                    .select();

                if (updateError) {
                    console.error('Error updating user settings:', updateError);
                    return res.status(500).json({ error: 'Error updating user settings' });
                }

                result = data[0];
            }
            // If settings don't exist, insert them
            else {
                const { data, error: insertError } = await supabase
                    .from('user_settings')
                    .insert([updatedSettings])
                    .select();

                if (insertError) {
                    console.error('Error inserting user settings:', insertError);
                    return res.status(500).json({ error: 'Error inserting user settings' });
                }

                result = data[0];
            }

            // Return updated settings
            return res.status(200).json(result);
        } catch (error) {
            console.error('Error in POST user settings:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // If method is not GET or POST, return 405 Method Not Allowed
    return res.status(405).json({ error: 'Method not allowed' });
}

// Wrap the handler with the auth middleware
export default authMiddleware(handler);