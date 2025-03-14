#!/bin/bash

# Navigate to the vercel-backend directory
cd vercel-backend

# Remove any existing .vercel directory
rm -rf .vercel

# Initialize a new Vercel project
echo "Initializing a new Vercel project..."
npx vercel link --yes

# Deploy to Vercel
echo "Deploying to Vercel..."
npx vercel --prod --yes
