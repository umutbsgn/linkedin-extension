import { createClient } from './popup/supabase-client.js';

import { API_ENDPOINTS } from './config.js';

// Initialize with empty values, will be fetched from the server
let supabaseUrl = '';
let supabaseKey = '';
let supabase = null;

// Fetch Supabase configuration from the server
async function fetchSupabaseConfig() {
    try {
        // Fetch Supabase URL
        const urlResponse = await fetch(API_ENDPOINTS.SUPABASE_URL);
        if (urlResponse.ok) {
            const urlData = await urlResponse.json();
            supabaseUrl = urlData.url;
        } else {
            console.error('Failed to fetch Supabase URL:', urlResponse.status, urlResponse.statusText);
        }

        // Fetch Supabase key
        const keyResponse = await fetch(API_ENDPOINTS.SUPABASE_KEY);
        if (keyResponse.ok) {
            const keyData = await keyResponse.json();
            supabaseKey = keyData.key;
        } else {
            console.error('Failed to fetch Supabase key:', keyResponse.status, keyResponse.statusText);
        }

        // Initialize Supabase client if both URL and key are available
        if (supabaseUrl && supabaseKey) {
            supabase = createClient(supabaseUrl, supabaseKey);
            console.log('Supabase client initialized with configuration from server');
        } else {
            console.error('Failed to initialize Supabase client: missing URL or key');
        }

        return { supabaseUrl, supabaseKey };
    } catch (error) {
        console.error('Error fetching Supabase configuration:', error);
        return { supabaseUrl: '', supabaseKey: '' };
    }
}

// Initialize Supabase client
fetchSupabaseConfig();

async function updateUsageStatistics(userId, requestType) {
    try {
        const { data: session, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error("Error getting session:", sessionError);
            throw new Error("Session error");
        }

        if (!session.session) {
            console.error("No session found.");
            throw new Error("No session");
        }

        const { error: updateError } = await supabase
            .from('usage_statistics')
            .update({
                [requestType]: requestType === 'post_count' ? 1 : 1
            })
            .eq('user_id', userId)
            .eq('month', new Date());

        if (updateError) {
            console.error("Error updating usage statistics:", updateError);
            throw new Error("Update error");
        } else {
            console.log("Usage statistics updated successfully!");
        }
    } catch (error) {
        console.error("An unexpected error occurred while updating usage statistics:", error);
    }
}


async function createTable() {
    try {
        const { data: session, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error("Error getting session:", sessionError);
            throw new Error("Session error");
        }

        if (!session.session) {
            console.error("No session found.");
            throw new Error("No session");
        }

        const { error: createError } = await supabase.from('usage_statistics').insert([{
            user_id: session.session.user.id,
            month: new Date(),
            post_count: 0,
            profile_connect_count: 0,
            created_at: new Date()
        }]);

        if (createError) {
            console.error("Error creating table:", createError);
            throw new Error("Create table error");
        } else {
            console.log("Table created successfully!");
        }
    } catch (error) {
        console.error("An unexpected error occurred:", error);
    }
}

createTable();

// Example usage:
// updateUsageStatistics('user123', 'post_count');
// updateUsageStatistics('user123', 'profile_connect_count');