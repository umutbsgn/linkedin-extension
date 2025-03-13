import { VERCEL_BACKEND_URL, API_ENDPOINTS } from './config.js';

// Test the healthcheck endpoint
async function testHealthcheck() {
    console.log('=== Testing Healthcheck Endpoint ===');
    console.log(`URL: ${VERCEL_BACKEND_URL}/api/healthcheck`);

    try {
        const response = await fetch(`${VERCEL_BACKEND_URL}/api/healthcheck`);

        console.log('Status:', response.status, response.statusText);
        console.log('Headers:', response.headers);

        if (response.ok) {
            const data = await response.json();
            console.log('Response data:', data);
            console.log('✅ Healthcheck endpoint is working!');
        } else {
            console.error('❌ Healthcheck endpoint returned an error!');
            try {
                const errorText = await response.text();
                console.error('Error response:', errorText);
            } catch (e) {
                console.error('Could not read error response');
            }
        }
    } catch (error) {
        console.error('❌ Failed to connect to healthcheck endpoint!');
        console.error('Error details:', error.message);
    }

    console.log('\n');
}

// Test the analyze endpoint
async function testAnalyzeEndpoint() {
    console.log('=== Testing Analyze Endpoint ===');
    console.log(`URL: ${API_ENDPOINTS.ANALYZE}`);

    const testPrompt = "Hello, this is a test prompt.";
    const testSystemPrompt = "You are a helpful assistant.";

    console.log('Test prompt:', testPrompt);
    console.log('Test system prompt:', testSystemPrompt);

    try {
        const response = await fetch(API_ENDPOINTS.ANALYZE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: testPrompt,
                systemPrompt: testSystemPrompt
            })
        });

        console.log('Status:', response.status, response.statusText);
        console.log('Headers:', response.headers);

        if (response.ok) {
            const data = await response.json();
            console.log('Response data:', data);
            console.log('✅ Analyze endpoint is working!');
        } else {
            console.error('❌ Analyze endpoint returned an error!');
            try {
                const errorText = await response.text();
                console.error('Error response:', errorText);
            } catch (e) {
                console.error('Could not read error response');
            }
        }
    } catch (error) {
        console.error('❌ Failed to connect to analyze endpoint!');
        console.error('Error details:', error.message);
    }

    console.log('\n');
}

// Test the Vercel deployment configuration
async function testVercelDeployment() {
    console.log('=== Testing Vercel Deployment Configuration ===');

    console.log('VERCEL_BACKEND_URL:', VERCEL_BACKEND_URL);
    console.log('API_ENDPOINTS.ANALYZE:', API_ENDPOINTS.ANALYZE);

    // Test if the URL is accessible
    try {
        const response = await fetch(VERCEL_BACKEND_URL);
        console.log('Main URL status:', response.status, response.statusText);
    } catch (error) {
        console.error('❌ Failed to connect to main URL!');
        console.error('Error details:', error.message);
    }

    console.log('\n');
}

// Run all tests
async function runTests() {
    console.log('=== Starting Vercel Connection Tests ===');
    console.log('Time:', new Date().toISOString());
    console.log('\n');

    await testVercelDeployment();
    await testHealthcheck();
    await testAnalyzeEndpoint();

    console.log('=== Tests Completed ===');
}

// Run the tests
runTests();

// Export the functions for use in the browser console
export {
    testHealthcheck,
    testAnalyzeEndpoint,
    testVercelDeployment,
    runTests
};