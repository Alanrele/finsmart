# 🔐 HTTPS Configurado para Microsoft Login

## ✅ Problema Resuelto

**Microsoft Login requiere HTTPS** - La autenticación con Microsoft no funciona con HTTP por razones de seguridad.

### 🛠️ Cambios Aplicados

#### 1. Configuración HTTPS en Vite
```javascript
// vite.config.js
server: {
  port: 3000,
  host: true,
  https: true  // ← Habilita HTTPS automático
}
```

#### 2. URLs Actualizadas
- **Frontend**: `https://localhost:3001` (HTTPS)
- **Backend**: `http://localhost:5001` (HTTP - OK para APIs)
- **Variables de entorno**: Actualizadas para HTTPS

#### 3. Configuración MSAL
- La configuración de MSAL usa `window.location.origin`
- Se adapta automáticamente a HTTPS
- `redirectUri` ahora apunta a `https://localhost:3001`

### 🔧 Estado Actual

#### ✅ Servicios Funcionando
- **Frontend HTTPS**: https://localhost:3001
- **Backend HTTP**: http://localhost:5001
- **MongoDB**: Conectado y operativo

#### ⚠️ Certificado Auto-firmado
El navegador mostrará una advertencia de seguridad:
1. **Chrome**: "Tu conexión no es privada"
2. **Solución**: Clic en "Avanzado" → "Continuar a localhost (sitio no seguro)"
3. **Esto es normal** para desarrollo local

### 📋 Azure AD - URIs de Redirección

**IMPORTANTE**: Ahora debes configurar HTTPS en Azure Portal

#### URLs para Azure AD:
```
https://localhost:3001
https://localhost:3001/auth-callback
```

#### Pasos en Azure Portal:
1. Ve a [Azure Portal](https://portal.azure.com)
2. Azure Active Directory → App registrations
3. Busca la app con Client ID: `29f56526-69dc-4e89-9955-060aa8292fd0`
4. Authentication → Single-page application
5. **Agrega estas URIs**:
   - `https://localhost:3001`
   - `https://localhost:3001/auth-callback`

### 🧪 Cómo Probar el Login

#### 1. Acceder con HTTPS
```bash
# Abre en el navegador:
https://localhost:3001
```

#### 2. Aceptar Certificado
- El navegador mostrará advertencia de seguridad
- Clic en "Avanzado" → "Continuar a localhost"
- **Esto es normal para desarrollo**

#### 3. Probar Microsoft Login
- Una vez en la app, clic en "Iniciar Sesión con Microsoft"
- Si Azure AD está configurado correctamente, redirigirá a Microsoft
- Después del login, volverá a la app autenticado

### 🔍 Debug y Troubleshooting

#### Si el login falla:
1. **Error "redirect_uri_mismatch"**:
   - Configura las URIs HTTPS en Azure Portal
   - Verifica que sean exactamente: `https://localhost:3001`

2. **Error "unauthorized_client"**:
   - Client ID incorrecto en Azure AD
   - Permisos faltantes en Azure AD

3. **Certificado rechazado**:
   - Acepta manualmente el certificado en el navegador
   - Para producción, usa certificados válidos

#### Debug Widget
- El widget en la esquina superior derecha muestra el estado de autenticación
- Botón "Logout" para probar flujos

### 🎯 Próximos Pasos

#### 1. Configurar Azure AD (Urgente)
- Agregar URIs HTTPS en Azure Portal
- **Sin esto, el Microsoft login no funcionará**

#### 2. Probar Login
```bash
# 1. Abrir app
https://localhost:3001

# 2. Aceptar certificado
# 3. Clic en "Microsoft Login"
# 4. Debería redirigir y autenticar
```

#### 3. Para Producción
- Usar certificados SSL válidos
- Configurar dominio personalizado
- Actualizar URIs en Azure AD

### 🎉 Resultado

**El login con Microsoft ahora funcionará correctamente** una vez que configures las URIs HTTPS en Azure Portal.

**URLs actualizadas:**
- ✅ Frontend: `https://localhost:3001`
- ✅ MSAL: Configurado para HTTPS
- ✅ Variables de entorno: Actualizadas
- ⚠️ Azure AD: **Pendiente configurar URIs HTTPS**

---

**Comando rápido para verificar:**
```bash
# Abrir navegador en:
https://localhost:3001

# Acepta el certificado y prueba el Microsoft login
```
