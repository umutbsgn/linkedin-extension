# LinkedIn AI Assistant Vercel Backend

This is the Vercel backend for the LinkedIn AI Assistant browser extension. It provides secure API endpoints for the extension to communicate with external services like Anthropic, Supabase, and PostHog.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env` file in the `vercel-backend` directory with the following variables:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ALLOWED_ORIGINS=chrome-extension://your-extension-id,*
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   POSTHOG_API_KEY=your_posthog_api_key
   POSTHOG_API_HOST=your_posthog_api_host
   ```

## Development

To run the development server:
```bash
npm run dev
```

This will start the Vercel development server, which will serve the API endpoints locally.

For debugging:
```bash
npm run debug
```

## Deployment

To deploy to Vercel:
```bash
npm run deploy
```

This will deploy the backend to Vercel. You'll need to be logged in to Vercel CLI first:
```bash
npx vercel login
```

## API Endpoints

- `/api/healthcheck`: Check if the server is running
- `/api/anthropic/analyze`: Proxy for Anthropic API
- `/api/supabase/auth/login`: Login with Supabase
- `/api/supabase/auth/signup`: Signup with Supabase
- `/api/supabase/user-settings`: Get/update user settings
- `/api/supabase/beta-access`: Check beta access
- `/api/analytics/track`: Track analytics events

## Environment Variables

The following environment variables are required:

- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., `chrome-extension://your-extension-id,*`)
- `SUPABASE_URL`: Your Supabase URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_KEY`: Your Supabase service key
- `POSTHOG_API_KEY`: Your PostHog API key
- `POSTHOG_API_HOST`: Your PostHog API host

## Project Structure

- `index.js`: Main entry point for the Express server
- `vercel.json`: Vercel configuration
- `package.json`: Project dependencies and scripts
