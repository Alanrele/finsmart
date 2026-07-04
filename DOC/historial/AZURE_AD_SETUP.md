# Configuración de Azure AD para FinSmart

## ⚠️ ERROR ACTUAL: redirect_uri no válido

Si ves este error al intentar login con Microsoft:
```
invalid_request: The provided value for the input parameter 'redirect_uri' is not valid
```

**Causa:** El redirect_uri `https://finsmart.up.railway.app/auth/ms-callback` no está registrado en Azure AD.

**Solución:** Sigue los pasos de abajo para agregarlo.

---

## Información de la Aplicación

- **Client ID**: `29f56526-69dc-4e89-9955-060aa8292fd0`
- **Authority**: `https://login.microsoftonline.com/common`
- **URL de Producción**: `https://finsmart.up.railway.app`
- **URL de Desarrollo**: `http://localhost:3001`

---

## 🚀 ACCIÓN REQUERIDA: Registrar Redirect URIs

### Paso 1: Ir a Azure Portal

1. **Accede a:** [Azure Portal - App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. **Busca tu aplicación** con Client ID: `29f56526-69dc-4e89-9955-060aa8292fd0`
3. **Click en el nombre** de la aplicación

### Paso 2: Configurar Authentication

1. En el menú izquierdo, click en **"Authentication"** (Autenticación)
2. Busca la sección **"Platform configurations"**
3. Si NO existe una plataforma "Single-page application":
   - Click en **"Add a platform"**
   - Selecciona **"Single-page application"**
4. Si YA existe, click en **"Add URI"** dentro de "Single-page application"

### Paso 3: Agregar las URIs

**IMPORTANTE:** Agrega EXACTAMENTE estas 3 URIs:

```
http://localhost:3001/auth/ms-callback
http://localhost:5000/auth/ms-callback
https://finsmart.up.railway.app/auth/ms-callback
```

**Captura de pantalla de cómo debe verse:**
```
Platform: Single-page application
├─ http://localhost:3001/auth/ms-callback     ✅
├─ http://localhost:5000/auth/ms-callback     ✅
└─ https://finsmart.up.railway.app/auth/ms-callback     ✅
```

### Paso 4: Configurar Implicit Grant (Opcional pero recomendado)

En la misma página "Authentication", baja hasta **"Implicit grant and hybrid flows"**:

- ✅ **Access tokens** (used for implicit flows)
- ✅ **ID tokens** (used for implicit and hybrid flows)

### Paso 5: Guardar

1. Click en **"Save"** (Guardar) en la parte superior
2. Espera a que aparezca "Successfully updated..."

---

## ✅ Verificación

Después de guardar, verifica que la configuración sea correcta:

### En Azure Portal:
1. Ve a Authentication
2. Verifica que las 3 URIs estén listadas
3. Verifica que "Access tokens" e "ID tokens" estén habilitados

### En tu aplicación:
1. Cierra el navegador completamente
2. Vuelve a abrir https://finsmart.up.railway.app
3. Click en "Login with Microsoft"
4. **Debería funcionar sin error de redirect_uri**

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
