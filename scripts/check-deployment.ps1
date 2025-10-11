# Script de Verificacion Rapida - FinSmart Railway (PowerShell)
# Este script verifica el estado del deployment en Railway

Write-Host "FinSmart Railway Deployment Checker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$RAILWAY_URL = "https://finsmart.up.railway.app"

# Test 1: Health Check
Write-Host "Test 1: Health Check Endpoint" -ForegroundColor Yellow
Write-Host "URL: $RAILWAY_URL/health"
try {
    $response = Invoke-WebRequest -Uri "$RAILWAY_URL/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "[PASS] Health endpoint responding (HTTP $($response.StatusCode))" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Health endpoint error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Root SPA
Write-Host "Test 2: Root SPA Route" -ForegroundColor Yellow
Write-Host "URL: $RAILWAY_URL/"
try {
    $response = Invoke-WebRequest -Uri "$RAILWAY_URL/" -UseBasicParsing
    $contentType = $response.Headers["Content-Type"]
    if ($response.StatusCode -eq 200 -and $contentType -like "*html*") {
        Write-Host "[PASS] Root serving HTML (HTTP $($response.StatusCode), Type: $contentType)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Root not serving SPA correctly (HTTP $($response.StatusCode), Type: $contentType)" -ForegroundColor Red
    }
} catch {
    Write-Host "[FAIL] Root route error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Login Route
Write-Host "Test 3: Login SPA Route" -ForegroundColor Yellow
Write-Host "URL: $RAILWAY_URL/login"
try {
    $response = Invoke-WebRequest -Uri "$RAILWAY_URL/login" -UseBasicParsing
    $contentType = $response.Headers["Content-Type"]
    if ($response.StatusCode -eq 200 -and $contentType -like "*html*") {
        Write-Host "[PASS] Login route serving HTML (HTTP $($response.StatusCode), Type: $contentType)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Login route not working (HTTP $($response.StatusCode), Type: $contentType)" -ForegroundColor Red
    }
} catch {
    Write-Host "[FAIL] Login route error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: API Route (should return 401 without auth)
Write-Host "Test 4: API Endpoint" -ForegroundColor Yellow
Write-Host "URL: $RAILWAY_URL/api/finance/dashboard"
try {
    $response = Invoke-WebRequest -Uri "$RAILWAY_URL/api/finance/dashboard" -UseBasicParsing -ErrorAction Stop
    Write-Host "[WARN] API responding without auth (HTTP $($response.StatusCode))" -ForegroundColor DarkYellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "[PASS] API responding with auth required (HTTP 401)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] API error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 5: Static Assets
Write-Host "Test 5: Static Assets" -ForegroundColor Yellow
Write-Host "URL: $RAILWAY_URL/assets/"
try {
    $response = Invoke-WebRequest -Uri "$RAILWAY_URL/assets/" -UseBasicParsing
    Write-Host "[PASS] Assets directory exists (HTTP $($response.StatusCode))" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "[PASS] Assets directory exists (HTTP 403 - directory listing disabled)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Assets check: $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open $RAILWAY_URL in your browser"
Write-Host "2. Press F12 to open DevTools Console"
Write-Host "3. Check for these logs:" -ForegroundColor Gray
Write-Host "   - MSAL Config - Railway Environment" -ForegroundColor DarkGray
Write-Host "   - API base URL: https://finsmart.up.railway.app/api" -ForegroundColor DarkGray
Write-Host "4. Try logging in with Microsoft"
Write-Host "5. Verify dashboard loads correctly"
Write-Host ""
Write-Host "Railway Dashboard: https://railway.app/dashboard" -ForegroundColor Blue
Write-Host "Full diagnostic guide: ./RAILWAY_DIAGNOSTIC.md" -ForegroundColor Blue
Write-Host ""
Write-Host "If you see errors, check:" -ForegroundColor Yellow
Write-Host "- Railway deployment logs for build errors"
Write-Host "- Environment variables are set correctly"
Write-Host "- MONGODB_URI and JWT_SECRET are configured"

