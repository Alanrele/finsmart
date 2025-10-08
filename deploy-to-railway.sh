#!/bin/bash

echo "🚀 Deploying FinSmart to Railway..."
echo "=================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    echo "Then run: railway login"
    exit 1
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run:"
    echo "railway login"
    exit 1
fi

echo "✅ Railway CLI ready"

# Link to existing project or create new one
echo "🔗 Linking to Railway project..."
if railway link; then
    echo "✅ Linked to existing Railway project"
else
    echo "📦 Creating new Railway project..."
    railway init finsmart
    echo "✅ Created new Railway project"
fi

# Set basic environment variables
echo "🔧 Setting basic environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=5000
railway variables set ENABLE_DEMO_LOGIN=true

echo ""
echo "⚠️  IMPORTANT: You need to set your API keys manually in Railway Dashboard"
echo "   Go to: https://railway.app/dashboard -> Your Project -> Variables"
echo ""
echo "   Required variables (copy from backend/.env.prod):"
echo "   ==============================================="
echo "   MONGODB_URI=your_mongodb_atlas_connection_string"
echo "   JWT_SECRET=your_secure_jwt_secret"
echo "   JWT_REFRESH_SECRET=your_refresh_secret"
echo "   OPENAI_API_KEY=your_openai_api_key"
echo "   GRAPH_CLIENT_ID=your_microsoft_graph_client_id"
echo "   GRAPH_CLIENT_SECRET=your_microsoft_graph_client_secret"
echo "   GRAPH_TENANT_ID=common"
echo "   AZURE_OCR_ENDPOINT=https://your-resource.cognitiveservices.azure.com/"
echo "   AZURE_OCR_KEY=your_azure_ocr_key"
echo "   SESSION_SECRET=your_session_secret"
echo "   TRUST_PROXY=true"
echo "   RATE_LIMIT_WINDOW_MS=900000"
echo "   RATE_LIMIT_MAX_REQUESTS=100"
echo ""

read -p "Have you set all the environment variables in Railway Dashboard? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please set the environment variables first, then run this script again."
    exit 1
fi

# Deploy
echo "🚀 Starting deployment..."
railway deploy

echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Wait for deployment to complete (check Railway dashboard)"
echo "2. Get your app URL from Railway dashboard"
echo "3. Update CORS settings with the actual Railway domain"
echo "4. Test the application functionality"
echo ""
echo "🔗 Useful commands:"
echo "railway logs     # View deployment logs"
echo "railway open     # Open app in browser"
echo "railway vars     # Check environment variables"