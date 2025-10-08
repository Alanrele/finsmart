#!/bin/bash

# Railway Environment Variables Setup Script
# This script helps set up environment variables in Railway

echo "🚀 Railway Environment Variables Setup"
echo "======================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it first:"
    echo "npm install -g @railway/cli"
    echo "railway login"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Run: railway login"
    exit 1
fi

echo "✅ Railway CLI is ready"
echo ""

# Check if in a Railway project
if ! railway status &> /dev/null; then
    echo "❌ Not in a Railway project. Run: railway init"
    exit 1
fi

echo "✅ Connected to Railway project"
echo ""

echo "🔧 Setting up environment variables..."
echo "This will set all required variables for FinSmart production deployment"
echo ""

# Read variables from .env.prod if it exists
ENV_FILE="backend/.env.prod"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE not found. Please ensure it exists with your production variables."
    exit 1
fi

echo "📖 Reading variables from $ENV_FILE..."
echo ""

# Function to set variable
set_var() {
    local key=$1
    local value=$2
    echo "Setting $key..."
    if railway variables set "$key" "$value"; then
        echo "✅ $key set successfully"
    else
        echo "❌ Failed to set $key"
        return 1
    fi
}

# Read and set variables
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue

    # Remove quotes if present
    value=$(echo "$value" | sed 's/^"//' | sed 's/"$//')

    if [ -n "$value" ]; then
        set_var "$key" "$value"
    fi
done < "$ENV_FILE"

echo ""
echo "🎉 Environment variables setup complete!"
echo ""
echo "🔄 Redeploying application..."
railway restart

echo ""
echo "📋 Next steps:"
echo "1. Check deployment logs: railway logs"
echo "2. Get your app URL: railway open"
echo "3. Update Azure AD redirect URIs with the Railway domain"
echo ""
echo "✅ Setup complete! Your FinSmart app should be running at the Railway URL."
