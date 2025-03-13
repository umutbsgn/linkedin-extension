# LinkedIn AI Assistant Browser Extension

A browser extension that enhances LinkedIn interactions using AI-powered features.

## Features

- AI-generated comments for LinkedIn posts
- AI-generated connection messages
- Customizable system prompts for different contexts
- User authentication with Supabase
- Analytics tracking with PostHog

## Architecture

The extension uses a secure architecture:

- Browser extension frontend (Chrome/Firefox)
- Vercel backend for API calls and authentication
- Supabase for user data storage
- Anthropic Claude API for AI capabilities

## Development

### Prerequisites

- Node.js and npm
- A Vercel account
- A Supabase account
- An Anthropic API key

### Setup

1. Clone the repository
2. Install dependencies: `cd vercel-backend && npm install`
3. Configure environment variables in Vercel
4. Deploy the backend to Vercel
5. Update the `VERCEL_BACKEND_URL` in `config.js` with your Vercel deployment URL
6. Load the extension in your browser

## Environment Variables

The following environment variables need to be configured in Vercel:

- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase project API key
- `POSTHOG_API_KEY`: Your PostHog API key
- `POSTHOG_API_HOST`: Your PostHog API host

## License

[MIT](LICENSE)
