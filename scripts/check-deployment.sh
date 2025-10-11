#!/bin/bash

# 🔍 Script de Verificación Rápida - FinSmart Railway
# Este script verifica el estado del deployment en Railway

echo "🔍 FinSmart Railway Deployment Checker"
echo "========================================"
echo ""

RAILWAY_URL="https://finsmart.up.railway.app"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "📊 Test 1: Health Check Endpoint"
echo "URL: $RAILWAY_URL/health"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Health endpoint responding (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
else
    echo -e "${RED}❌ FAIL${NC} - Health endpoint not responding (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi
echo ""

# Test 2: Root SPA
echo "📱 Test 2: Root SPA Route"
echo "URL: $RAILWAY_URL/"
ROOT_HEADERS=$(curl -s -I "$RAILWAY_URL/")
ROOT_CODE=$(echo "$ROOT_HEADERS" | grep -i "HTTP" | awk '{print $2}')
ROOT_TYPE=$(echo "$ROOT_HEADERS" | grep -i "content-type" | awk '{print $2}')

if [ "$ROOT_CODE" = "200" ] && [[ "$ROOT_TYPE" == *"html"* ]]; then
    echo -e "${GREEN}✅ PASS${NC} - Root serving HTML (HTTP $ROOT_CODE, Type: $ROOT_TYPE)"
else
    echo -e "${RED}❌ FAIL${NC} - Root not serving SPA correctly (HTTP $ROOT_CODE, Type: $ROOT_TYPE)"
fi
echo ""

# Test 3: Login Route
echo "🔐 Test 3: Login SPA Route"
echo "URL: $RAILWAY_URL/login"
LOGIN_HEADERS=$(curl -s -I "$RAILWAY_URL/login")
LOGIN_CODE=$(echo "$LOGIN_HEADERS" | grep -i "HTTP" | awk '{print $2}')
LOGIN_TYPE=$(echo "$LOGIN_HEADERS" | grep -i "content-type" | awk '{print $2}')

if [ "$LOGIN_CODE" = "200" ] && [[ "$LOGIN_TYPE" == *"html"* ]]; then
    echo -e "${GREEN}✅ PASS${NC} - Login route serving HTML (HTTP $LOGIN_CODE, Type: $LOGIN_TYPE)"
else
    echo -e "${RED}❌ FAIL${NC} - Login route not working (HTTP $LOGIN_CODE, Type: $LOGIN_TYPE)"
fi
echo ""

# Test 4: API Route (should return 401 without auth)
echo "🔌 Test 4: API Endpoint"
echo "URL: $RAILWAY_URL/api/finance/dashboard"
API_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/api/finance/dashboard")
API_CODE=$(echo "$API_RESPONSE" | tail -n1)

if [ "$API_CODE" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC} - API responding with auth required (HTTP $API_CODE)"
elif [ "$API_CODE" = "200" ]; then
    echo -e "${YELLOW}⚠️  WARN${NC} - API responding without auth (HTTP $API_CODE)"
else
    echo -e "${RED}❌ FAIL${NC} - API not responding correctly (HTTP $API_CODE)"
fi
echo ""

# Test 5: Static Assets
echo "📦 Test 5: Static Assets"
echo "URL: $RAILWAY_URL/assets/"
ASSETS_HEADERS=$(curl -s -I "$RAILWAY_URL/assets/")
ASSETS_CODE=$(echo "$ASSETS_HEADERS" | grep -i "HTTP" | awk '{print $2}')

if [ "$ASSETS_CODE" = "200" ] || [ "$ASSETS_CODE" = "403" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Assets directory exists (HTTP $ASSETS_CODE)"
else
    echo -e "${RED}❌ FAIL${NC} - Assets directory not found (HTTP $ASSETS_CODE)"
fi
echo ""

# Summary
echo "========================================"
echo "📋 Summary"
echo "========================================"

if [ "$HTTP_CODE" = "200" ] && [ "$ROOT_CODE" = "200" ] && [ "$LOGIN_CODE" = "200" ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open $RAILWAY_URL in your browser"
    echo "2. Check browser console for any errors"
    echo "3. Try logging in with Microsoft"
    echo "4. Verify dashboard loads correctly"
else
    echo -e "${RED}❌ Some tests failed. Check the details above.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check Railway deployment logs"
    echo "2. Verify frontend built correctly"
    echo "3. Check environment variables in Railway"
    echo "4. See RAILWAY_DIAGNOSTIC.md for detailed guide"
fi

echo ""
echo "🔗 Railway Dashboard: https://railway.app/dashboard"
echo "📚 Full diagnostic guide: ./RAILWAY_DIAGNOSTIC.md"
