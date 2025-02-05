import { createClient } from './popup/supabase-client.js';

const supabaseUrl = 'https://fslbhbywcxqmqhwdcgcl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbGJoYnl3Y3hxbXFod2RjZ2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0MTc2MTQsImV4cCI6MjA1Mzk5MzYxNH0.vOWNflNbXMjzvjVbNPDZdwQqt2jUFy0M2gnt-msWQMM';
const supabase = createClient(supabaseUrl, supabaseKey);

const ANTHROPIC_API_KEY = 'anthropicApiKey';

async function getApiKey() {
  const result = await chrome.storage.local.get(ANTHROPIC_API_KEY);
  return result[ANTHROPIC_API_KEY];
}

async function callAnthropicAPI(prompt, systemPrompt) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('API key not found. Please set your Anthropic API key in the extension options.');
  }

  // Additional validation of the API key
  if (!apiKey.startsWith('sk-ant-api')) {
    throw new Error('Invalid API key format. Please check your Anthropic API key.');
  }

  // Migrate old API key if exists
  await migrateOldApiKey();

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API call failed: ${response.status} - ${errorData.error?.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyze") {
    callAnthropicAPI(request.text, request.systemPrompt)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates an asynchronous response
  } else if (request.action === "storeSupabaseToken") {
    chrome.storage.local.set({ supabaseAuthToken: request.token }, () => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === "getSupabaseToken") {
    chrome.storage.local.get('supabaseAuthToken', (result) => {
      sendResponse({ token: result.supabaseAuthToken });
    });
    return true;
  }
});

// Initialize Supabase session and migrate old API key
chrome.runtime.onInstalled.addListener(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      chrome.storage.local.set({ supabaseAuthToken: session.access_token });
    }
  });
  migrateOldApiKey();
});

async function migrateOldApiKey() {
  const result = await chrome.storage.local.get(['apiKey', ANTHROPIC_API_KEY]);
  if (result.apiKey && !result[ANTHROPIC_API_KEY]) {
    await chrome.storage.local.set({ [ANTHROPIC_API_KEY]: result.apiKey });
    await chrome.storage.local.remove('apiKey');
    console.log('Migrated old API key to new format');
  }
}
