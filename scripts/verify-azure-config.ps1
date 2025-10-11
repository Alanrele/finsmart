# Script de Verificacion de Configuracion Azure AD
# Este script muestra la configuracion actual de MSAL

Write-Host "Verificacion de Configuracion Azure AD - FinSmart" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# Leer la configuracion de MSAL
$msalConfigPath = "c:\Proyectos\PAIR-BCP\frontend\src\config\msalConfig.js"

if (Test-Path $msalConfigPath) {
    Write-Host "Archivo de configuracion encontrado:" -ForegroundColor Green
    Write-Host $msalConfigPath
    Write-Host ""

    $content = Get-Content $msalConfigPath -Raw

    # Extraer Client ID
    if ($content -match "clientId:\s*'([^']+)'") {
        $clientId = $matches[1]
        Write-Host "Client ID:" -ForegroundColor Yellow
        Write-Host "  $clientId" -ForegroundColor White
        Write-Host ""
    }

    # Extraer Authority
    if ($content -match "authority:\s*'([^']+)'") {
        $authority = $matches[1]
        Write-Host "Authority:" -ForegroundColor Yellow
        Write-Host "  $authority" -ForegroundColor White
        Write-Host ""
    }

    Write-Host "Redirect URIs que deberian estar registrados en Azure:" -ForegroundColor Yellow
    Write-Host "  http://localhost:3001/auth/ms-callback" -ForegroundColor Cyan
    Write-Host "  http://localhost:5000/auth/ms-callback" -ForegroundColor Cyan
    Write-Host "  https://finsmart.up.railway.app/auth/ms-callback" -ForegroundColor Cyan
    Write-Host ""

} else {
    Write-Host "ERROR: No se encuentra el archivo de configuracion" -ForegroundColor Red
    Write-Host $msalConfigPath
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pasos para configurar Azure AD:" -ForegroundColor Yellow
Write-Host "1. Ve a: https://portal.azure.com" -ForegroundColor White
Write-Host "2. Busca: App registrations" -ForegroundColor White
Write-Host "3. Selecciona tu app (Client ID de arriba)" -ForegroundColor White
Write-Host "4. Click en: Authentication" -ForegroundColor White
Write-Host "5. Agrega los Redirect URIs mostrados arriba" -ForegroundColor White
Write-Host "6. Habilita: Access tokens + ID tokens" -ForegroundColor White
Write-Host "7. Guarda los cambios" -ForegroundColor White
Write-Host ""

# Verificar conectividad a Railway
Write-Host "Verificando conectividad a Railway..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://finsmart.up.railway.app/health" -UseBasicParsing
    Write-Host "[OK] Railway responde correctamente (HTTP $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] No se puede conectar a Railway" -ForegroundColor Red
}
Write-Host ""

Write-Host "Enlace directo a Azure Portal:" -ForegroundColor Yellow
Write-Host "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" -ForegroundColor Cyan
