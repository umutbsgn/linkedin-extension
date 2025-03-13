import { VERCEL_BACKEND_URL } from './config.js';

async function checkVercelConnection() {
    console.log(`Checking connection to Vercel at: ${VERCEL_BACKEND_URL}`);

    try {
        // Try to connect to the healthcheck endpoint
        const healthcheckUrl = `${VERCEL_BACKEND_URL}/api/healthcheck`;
        console.log(`Connecting to: ${healthcheckUrl}`);

        const response = await fetch(healthcheckUrl);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Connection successful!');
            console.log('Response:', data);
            return true;
        } else {
            console.error('❌ Server responded with error:', response.status, response.statusText);
            console.error('This could mean the endpoint exists but returned an error');
            return false;
        }
    } catch (error) {
        console.error('❌ Connection failed!');
        console.error('Error details:', error.message);
        console.error('\nPossible reasons:');
        console.error('1. The Vercel deployment does not exist yet');
        console.error('2. The URL in config.js is incorrect');
        console.error('3. There is a network connectivity issue');
        console.error('4. CORS policy is blocking the request');
        console.error('5. The API endpoint is not properly configured');
        return false;
    }
}

// Export the function for use in other files
export default checkVercelConnection;

// If this script is run directly, execute the check
if (typeof window !== 'undefined' && window.document) {
    // Running in browser context
    document.addEventListener('DOMContentLoaded', () => {
        checkVercelConnection();
    });
} else if (typeof module !== 'undefined' && module.exports) {
    // Running in Node.js context
    checkVercelConnection();
}