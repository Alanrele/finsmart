# FinSmart Production Setup Script
# This script configures environment variables and secrets after deployment

param(
    [Parameter(Mandatory=$true)]
    [string]$EnvironmentName,

    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName
)

Write-Host "🚀 Setting up FinSmart production environment..." -ForegroundColor Green

# Get Container App URLs
Write-Host "📡 Getting Container App URLs..." -ForegroundColor Yellow
$frontendApp = az containerapp show --name "ca-frontend-$(az group show --name $ResourceGroupName --query 'tags.""azd-env-name""' -o tsv)" --resource-group $ResourceGroupName --query 'properties.configuration.ingress.fqdn' -o tsv
$backendApp = az containerapp show --name "ca-backend-$(az group show --name $ResourceGroupName --query 'tags.""azd-env-name""' -o tsv)" --resource-group $ResourceGroupName --query 'properties.configuration.ingress.fqdn' -o tsv

$frontendUrl = "https://$frontendApp"
$backendUrl = "https://$backendApp"

Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
Write-Host "Backend URL: $backendUrl" -ForegroundColor Cyan

# Update Frontend Container App Environment Variables
Write-Host "🔧 Updating Frontend environment variables..." -ForegroundColor Yellow
az containerapp update `
    --name "ca-frontend-*" `
    --resource-group $ResourceGroupName `
    --set-env-vars "VITE_API_URL=$backendUrl"

# Update Backend Container App Environment Variables
Write-Host "🔧 Updating Backend environment variables..." -ForegroundColor Yellow
az containerapp update `
    --name "ca-backend-*" `
    --resource-group $ResourceGroupName `
    --set-env-vars "FRONTEND_URL=$frontendUrl" "REDIRECT_URI=$frontendUrl/auth/ms-callback" "ALLOWED_ORIGINS=$frontendUrl"

Write-Host "✅ Environment variables updated successfully!" -ForegroundColor Green

# Get Key Vault name
$keyVaultName = az keyvault list --resource-group $ResourceGroupName --query '[0].name' -o tsv

Write-Host "🔐 Key Vault found: $keyVaultName" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: You need to manually add the following secrets to Key Vault:" -ForegroundColor Red
Write-Host "az keyvault secret set --vault-name $keyVaultName --name mongodb-uri --value 'YOUR_MONGODB_CONNECTION_STRING'" -ForegroundColor White
Write-Host "az keyvault secret set --vault-name $keyVaultName --name jwt-secret --value 'YOUR_JWT_SECRET'" -ForegroundColor White
Write-Host "az keyvault secret set --vault-name $keyVaultName --name jwt-refresh-secret --value 'YOUR_JWT_REFRESH_SECRET'" -ForegroundColor White
Write-Host "az keyvault secret set --vault-name $keyVaultName --name openai-api-key --value 'YOUR_OPENAI_API_KEY'" -ForegroundColor White
Write-Host "az keyvault secret set --vault-name $keyVaultName --name graph-client-id --value 'YOUR_GRAPH_CLIENT_ID'" -ForegroundColor White
Write-Host "az keyvault secret set --vault-name $keyVaultName --name graph-client-secret --value 'YOUR_GRAPH_CLIENT_SECRET'" -ForegroundColor White
Write-Host "az keyvault secret set --vault-name $keyVaultName --name azure-ocr-endpoint --value 'YOUR_AZURE_OCR_ENDPOINT'" -ForegroundColor White
Write-Host "az keyvault secret set --vault-name $keyVaultName --name azure-ocr-key --value 'YOUR_AZURE_OCR_KEY'" -ForegroundColor White
Write-Host "az keyvault secret set --vault-name $keyVaultName --name session-secret --value 'YOUR_SESSION_SECRET'" -ForegroundColor White

Write-Host ""
Write-Host "🎉 Setup completed! Your FinSmart application should be running at:" -ForegroundColor Green
Write-Host "Frontend: $frontendUrl" -ForegroundColor Cyan
Write-Host "Backend:  $backendUrl" -ForegroundColor Cyan
