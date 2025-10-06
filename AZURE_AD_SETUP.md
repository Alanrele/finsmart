# Configuración de Azure AD para FinSmart

## Información de la Aplicación
- **Client ID**: `29f56526-69dc-4e89-9955-060aa8292fd0`
- **URL del Frontend Desarrollo**: `https://localhost:3001`
- **URL del Frontend Producción**: `https://finsmart-production.up.railway.app`
- **URLs de Redirección**:
  - Desarrollo: `https://localhost:3001`
  - Producción: `https://finsmart-production.up.railway.app`

## ⚠️ ACCIÓN REQUERIDA: Actualizar URLs de Redirección

### 🚨 Para que funcione el login de Microsoft en Railway:

1. **Ve a [Azure Portal](https://portal.azure.com)**
2. **Busca "Azure Active Directory" o "Microsoft Entra ID"**
3. **Ve a "App registrations"**
4. **Busca la aplicación con Client ID: `29f56526-69dc-4e89-9955-060aa8292fd0`**
5. **Click en "Authentication"**
6. **En "Platform configurations" > "Single-page application"**
7. **AGREGA estas URIs de redirección:**
   - `https://finsmart-production.up.railway.app`
   - `https://finsmart-production.up.railway.app/`
   - `https://localhost:3001` (mantener para desarrollo)
   - `https://localhost:3001/` (mantener para desarrollo)

### 📋 URIs de Redirección Completas:
```
https://localhost:3001
https://localhost:3001/
https://finsmart-production.up.railway.app
https://finsmart-production.up.railway.app/
```

## Pasos para Configurar en Azure Portal

### 1. Acceder al Azure Portal
1. Ve a [Azure Portal](https://portal.azure.com)
2. Busca "Azure Active Directory" o "Microsoft Entra ID"
3. Ve a "App registrations"
4. Busca la aplicación con Client ID: `29f56526-69dc-4e89-9955-060aa8292fd0`

### 2. Configurar URIs de Redirección
1. En la aplicación, ve a "Authentication"
2. En "Platform configurations", busca "Single-page application"
3. Agrega las siguientes URIs de redirección:
   - `https://localhost:3001`
   - `https://localhost:3001/auth-callback`
   - `https://localhost:3000` (backup)
   - `https://localhost:3000/auth-callback` (backup)

### 3. Configurar Permisos API
1. Ve a "API permissions"
2. Asegúrate de que estos permisos estén configurados:
   - Microsoft Graph:
     - `User.Read` (Delegated)
     - `Mail.Read` (Delegated)
     - `Mail.ReadBasic` (Delegated)
     - `openid` (Delegated)
     - `profile` (Delegated)
     - `email` (Delegated)

### 4. Verificar Configuración
1. En "Overview", verifica:
   - Application (client) ID: `29f56526-69dc-4e89-9955-060aa8292fd0`
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"

## Estado Actual
- ✅ Frontend funcionando en puerto 3001 con HTTPS
- ✅ Backend funcionando en puerto 5001
- ✅ MSAL configurado correctamente
- ✅ Componente MSALInitializing implementado
- ✅ Manejo de errores de inicialización
- ⚠️ **Pendiente**: Configurar URIs de redirección HTTPS en Azure Portal

## Pruebas
1. Abre `https://localhost:3001`
2. Acepta el certificado auto-firmado (clic en "Avanzado" > "Continuar a localhost")
3. Haz clic en "Iniciar Sesión con Microsoft"
4. Si hay error de URI de redirección, configura en Azure Portal
5. Una vez configurado, el login debería funcionar correctamente

## Modo de Desarrollo
- El login en modo de desarrollo sigue disponible
- Puedes usar cualquier email/contraseña para acceder
- Útil mientras se configura Azure AD
