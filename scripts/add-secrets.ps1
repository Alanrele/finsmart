# FinSmart Key Vault Secrets Setup
# This script helps add secrets to Azure Key Vault

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$MongoDbUri,
    
    [Parameter(Mandatory=$false)]
    [string]$OpenAiApiKey,
    
    [Parameter(Mandatory=$false)]
    [string]$GraphClientId,
    
    [Parameter(Mandatory=$false)]
    [string]$GraphClientSecret,
    
    [Parameter(Mandatory=$false)]
    [string]$AzureOcrEndpoint,
    
    [Parameter(Mandatory=$false)]
    [string]$AzureOcrKey
)

Write-Host "🔐 Setting up Key Vault secrets for FinSmart..." -ForegroundColor Green

# Get Key Vault name
$keyVaultName = az keyvault list --resource-group $ResourceGroupName --query '[0].name' -o tsv

if (-not $keyVaultName) {
    Write-Error "❌ Key Vault not found in resource group $ResourceGroupName"
    exit 1
}

Write-Host "📋 Key Vault found: $keyVaultName" -ForegroundColor Cyan

# Generate secure secrets if not provided
if (-not $MongoDbUri) {
    $MongoDbUri = Read-Host "Enter MongoDB connection string"
}

if (-not $OpenAiApiKey) {
    $OpenAiApiKey = Read-Host "Enter OpenAI API key"
}

if (-not $GraphClientId) {
    $GraphClientId = Read-Host "Enter Microsoft Graph Client ID"
}

if (-not $GraphClientSecret) {
    $GraphClientSecret = Read-Host "Enter Microsoft Graph Client Secret" -AsSecureString
    $GraphClientSecret = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($GraphClientSecret))
}

if (-not $AzureOcrEndpoint) {
    $AzureOcrEndpoint = Read-Host "Enter Azure OCR Endpoint"
}

if (-not $AzureOcrKey) {
    $AzureOcrKey = Read-Host "Enter Azure OCR Key" -AsSecureString
    $AzureOcrKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AzureOcrKey))
}

# Generate JWT secrets
$jwtSecret = [System.Web.Security.Membership]::GeneratePassword(64, 10)
$jwtRefreshSecret = [System.Web.Security.Membership]::GeneratePassword(64, 10)
$sessionSecret = [System.Web.Security.Membership]::GeneratePassword(32, 5)

Write-Host "🔑 Adding secrets to Key Vault..." -ForegroundColor Yellow

# Add secrets to Key Vault
try {
    az keyvault secret set --vault-name $keyVaultName --name "mongodb-uri" --value $MongoDbUri
    Write-Host "✅ Added: mongodb-uri" -ForegroundColor Green
    
    az keyvault secret set --vault-name $keyVaultName --name "jwt-secret" --value $jwtSecret
    Write-Host "✅ Added: jwt-secret (generated)" -ForegroundColor Green
    
    az keyvault secret set --vault-name $keyVaultName --name "jwt-refresh-secret" --value $jwtRefreshSecret
    Write-Host "✅ Added: jwt-refresh-secret (generated)" -ForegroundColor Green
    
    az keyvault secret set --vault-name $keyVaultName --name "openai-api-key" --value $OpenAiApiKey
    Write-Host "✅ Added: openai-api-key" -ForegroundColor Green
    
    az keyvault secret set --vault-name $keyVaultName --name "graph-client-id" --value $GraphClientId
    Write-Host "✅ Added: graph-client-id" -ForegroundColor Green
    
    az keyvault secret set --vault-name $keyVaultName --name "graph-client-secret" --value $GraphClientSecret
    Write-Host "✅ Added: graph-client-secret" -ForegroundColor Green
    
    az keyvault secret set --vault-name $keyVaultName --name "azure-ocr-endpoint" --value $AzureOcrEndpoint
    Write-Host "✅ Added: azure-ocr-endpoint" -ForegroundColor Green
    
    az keyvault secret set --vault-name $keyVaultName --name "azure-ocr-key" --value $AzureOcrKey
    Write-Host "✅ Added: azure-ocr-key" -ForegroundColor Green
    
    az keyvault secret set --vault-name $keyVaultName --name "session-secret" --value $sessionSecret
    Write-Host "✅ Added: session-secret (generated)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "🎉 All secrets added successfully!" -ForegroundColor Green
    Write-Host "⚠️  Please restart your Container Apps to apply the new secrets:" -ForegroundColor Yellow
    Write-Host "az containerapp revision restart --name ca-frontend-* --resource-group $ResourceGroupName" -ForegroundColor White
    Write-Host "az containerapp revision restart --name ca-backend-* --resource-group $ResourceGroupName" -ForegroundColor White
    
} catch {
    Write-Error "❌ Failed to add secrets: $($_.Exception.Message)"
    exit 1
}