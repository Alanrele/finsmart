# 🚂 Railway Deployment Diagnostic Guide

## 📋 Estado Actual del Proyecto

### Última actualización: 2025-10-11

---

## ✅ Cambios Recientes Implementados

### 1. **Dockerfile Optimizado**
- ✅ Multi-stage build (frontend + backend)
- ✅ Verificación de `index.html` después de copiar frontend
- ✅ Usuario no-root para seguridad
- ✅ Dependencias de producción optimizadas

### 2. **Package.json Limpio**
- ✅ Removido `postinstall` (conflictuaba con Docker build)
- ✅ Removido `prestart` (no funciona en entorno Docker)
- ✅ Solo scripts esenciales: `start`, `dev`, `test`

### 3. **Configuración Dinámica**
- ✅ `getRailwayConfig()` detecta automáticamente el entorno
- ✅ URLs se construyen dinámicamente basadas en `window.location`
- ✅ `redirectUri` de Microsoft MSAL es dinámico

---

## 🔍 Checklist de Diagnóstico

### Paso 1: Verificar Build en Railway

Revisa los logs de deployment en Railway y busca:

```bash
# ✅ Etapa 1: Frontend Build
[frontend-build] Successfully compiled
[frontend-build] dist ready in XXXXms

# ✅ Etapa 2: Backend Setup
[backend] npm ci completed
[backend] Copying frontend assets...
[backend] Verifying frontend...
[backend] ✓ index.html found

# ✅ Inicio del servidor
Starting server on port 5000
✅ Connected to MongoDB
✅ Server is running on port 5000
```

**⚠️ Si ves errores:**
```bash
# ❌ Error común 1: Frontend build failed
ERROR: Frontend build failed - index.html not found
→ Solución: Revisar logs de frontend-build stage

# ❌ Error común 2: Dependencies failed
npm ERR! code ELIFECYCLE
→ Solución: Verificar package.json y dependencias

# ❌ Error común 3: MongoDB connection failed
MongooseError: Could not connect to MongoDB
→ Solución: Verificar MONGODB_URI en variables de entorno
```

---

### Paso 2: Verificar Variables de Entorno en Railway

Ve a Railway Dashboard → Tu proyecto → Variables:

**Variables Requeridas:**
```env
# Backend (CRÍTICAS)
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-super-secret-jwt-key-here
PORT=5000
NODE_ENV=production

# APIs Opcionales (para funcionalidad completa)
OPENAI_API_KEY=sk-...
AZURE_OCR_ENDPOINT=https://...
AZURE_OCR_KEY=...

# Microsoft Graph (para autenticación)
VITE_GRAPH_CLIENT_ID=29f56526-69dc-4e89-9955-060aa8292fd0
VITE_GRAPH_TENANT_ID=common
```

**⚠️ Variables NO necesarias (el frontend las construye dinámicamente):**
- ❌ VITE_API_URL (se usa `window.location.origin`)
- ❌ VITE_WEBSOCKET_URL (se construye dinámicamente)

---

### Paso 3: Probar Endpoints

Usa estos comandos o el navegador:

#### A. Health Check (debería funcionar siempre)
```bash
curl https://finsmart.up.railway.app/health
```

**Respuesta esperada:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-11T...",
  "port": 5000,
  "env": "production",
  "mongodb": "configured",
  "openai": "configured",
  "socketio": {
    "connected_clients": 0
  }
}
```

#### B. SPA Root (debería servir index.html)
```bash
curl -I https://finsmart.up.railway.app/
```

**Respuesta esperada:**
```
HTTP/2 200
content-type: text/html; charset=utf-8
```

#### C. SPA Login Route (debería servir index.html)
```bash
curl -I https://finsmart.up.railway.app/login
```

**Respuesta esperada:**
```
HTTP/2 200
content-type: text/html; charset=utf-8
```

#### D. API Route (debería devolver JSON o 401)
```bash
curl -I https://finsmart.up.railway.app/api/finance/dashboard
```

**Respuesta esperada:**
```
HTTP/2 401  # Sin token
content-type: application/json
```

---

### Paso 4: Verificar Frontend en el Navegador

#### A. Abrir DevTools (F12) y ir a Console

Busca estos logs al cargar la página:

```javascript
// ✅ Configuración cargada correctamente
🔗 MSAL Config - Railway Environment: {
  isDevelopment: false,
  isProduction: true,
  hostname: "finsmart.up.railway.app",
  redirectUri: "https://finsmart.up.railway.app/auth/ms-callback"
}

// ✅ API configurada correctamente
🔗 API base URL: https://finsmart.up.railway.app/api

// ✅ Socket.IO conectado
🔌 Socket connected
```

**⚠️ Errores a buscar:**

```javascript
// ❌ Error 1: Frontend no cargó
Failed to load resource: 404 /login
→ Problema: backend/public/ vacío o no existe

// ❌ Error 2: API no responde
Failed to load resource: 404 /api/auth/microsoft/callback
→ Problema: Backend no inició o ruta incorrecta

// ❌ Error 3: CORS error
Access to XMLHttpRequest blocked by CORS policy
→ Problema: Verificar CORS en backend/src/server.js
```

#### B. Verificar Network Tab

Filtra por `login` y verifica:
- ✅ Status: 200
- ✅ Type: document
- ✅ Content-Type: text/html

---

### Paso 5: Probar Flujo de Autenticación Microsoft

1. **Click en "Login with Microsoft"**
   
   **Console logs esperados:**
   ```javascript
   🚀 Starting Microsoft login redirect...
   🔗 Using redirect URI: https://finsmart.up.railway.app/auth/ms-callback
   ```

2. **Redirige a Microsoft**
   
   URL esperada:
   ```
   https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
   client_id=29f56526-69dc-4e89-9955-060aa8292fd0&
   redirect_uri=https://finsmart.up.railway.app/auth/ms-callback&
   ...
   ```

3. **Microsoft redirige de vuelta**
   
   URL esperada:
   ```
   https://finsmart.up.railway.app/auth/ms-callback#code=...
   ```
   
   **Console logs esperados:**
   ```javascript
   📱 AuthCallback component mounted
   ✅ AuthCallback - Login successful: user@example.com
   🔑 AuthCallback - MS access token obtained, exchanging for app JWT
   ```

4. **Backend exchange**
   
   Network tab debería mostrar:
   ```
   POST /api/auth/microsoft/callback
   Status: 200
   Response: { "token": "...", "user": {...} }
   ```

5. **Redirige a dashboard**
   ```
   → /dashboard
   ✅ Autenticación exitosa con Microsoft
   ```

---

## 🐛 Problemas Comunes y Soluciones

### Problema 1: "404 on /login"

**Causa:** `backend/public/index.html` no existe

**Diagnóstico:**
```bash
# En Railway logs:
ERROR: Frontend build failed - index.html not found
```

**Solución:**
1. Verificar que el build de frontend completó sin errores
2. Revisar logs de la etapa `frontend-build`
3. Si persiste, agregar más logging en Dockerfile:

```dockerfile
RUN npm run build && ls -la dist/
```

---

### Problema 2: "404 on /api/auth/microsoft/callback"

**Causa:** Backend no está sirviendo rutas API correctamente

**Diagnóstico:**
```bash
# Verificar que el backend inició:
curl https://finsmart.up.railway.app/health
```

**Si health funciona pero callback no:**
- Verificar `backend/src/routes/authRoutes.js`
- Verificar que `app.use('/api/auth', authRoutes)` está en `server.js`
- Revisar logs del backend para errores

---

### Problema 3: "CORS Error"

**Causa:** Dominio no está en allowedOrigins

**Solución:**
Verificar `backend/src/server.js`:
```javascript
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:5000',
  'https://finsmart.up.railway.app',  // ← Debe estar aquí
  'https://finsmart-production.up.railway.app'
];
```

---

### Problema 4: "Cannot GET /login" (Railway)

**Causa:** Railway no está usando el Dockerfile

**Solución:**
1. Railway Dashboard → Settings
2. Builder → Seleccionar "Dockerfile"
3. Redeploy

---

### Problema 5: "Microsoft redirect loop"

**Causa:** redirectUri no coincide con Azure AD config

**Verificar en Azure Portal:**
1. Azure AD → App registrations
2. Tu app → Authentication
3. Redirect URIs debe incluir:
   ```
   https://finsmart.up.railway.app/auth/ms-callback
   ```

---

## 📊 Estado de Archivos Críticos

### ✅ Dockerfile
- Ubicación: `/Dockerfile`
- Estado: Configurado correctamente
- Verificación: `test -f ./public/index.html`

### ✅ backend/package.json
- Scripts limpios (sin pre/post hooks)
- Dependencias de producción optimizadas

### ✅ backend/src/server.js
- CORS configurado
- Static serving habilitado
- SPA fallback configurado
- Health check en `/health`

### ✅ frontend/src/config/railway.js
- Detección automática de entorno
- URLs dinámicas basadas en hostname

### ✅ frontend/src/hooks/useMicrosoftAuth.js
- redirectUri dinámico
- Logging mejorado para debug

---

## 🎯 Próximos Pasos

### Inmediato (ahora):
1. ⏳ Esperar que Railway complete el deployment
2. 🔍 Revisar logs de build en Railway
3. ✅ Probar `/health` endpoint
4. ✅ Probar `/login` en navegador

### Si todo funciona:
1. ✅ Probar login con Microsoft
2. ✅ Verificar que no hay errores React #310
3. ✅ Monitorear logs por 24-48h

### Si hay problemas:
1. 📋 Copiar logs completos de Railway
2. 🔍 Identificar el primer error
3. 🛠️ Aplicar solución del problema correspondiente
4. 🔄 Redeploy y verificar

---

## 📝 Comandos Útiles

### Ver logs de Railway (si tienes CLI):
```bash
railway logs
```

### Rebuild forzado:
```bash
# En Railway Dashboard:
Deployments → Latest → Redeploy
```

### Test local del Dockerfile:
```bash
# Build
docker build -t finsmart-test .

# Run (reemplaza las env vars)
docker run -p 5000:5000 \
  -e MONGODB_URI="your_uri" \
  -e JWT_SECRET="your_secret" \
  finsmart-test

# Test
curl http://localhost:5000/health
curl http://localhost:5000/login
```

---

## 🆘 Si Nada Funciona

**Plan B: Verificar estructura en Railway:**

```bash
# Conectar a Railway shell (si disponible):
railway run bash

# Verificar estructura:
ls -la /app/
ls -la /app/public/
cat /app/public/index.html  # ¿Existe?

# Verificar proceso:
ps aux | grep node
netstat -tulpn | grep 5000

# Ver variables de entorno:
env | grep -E 'MONGODB|JWT|NODE_ENV|PORT'
```

---

## ✅ Checklist Final

Antes de reportar que todo está funcionando:

- [ ] `/health` retorna 200 con JSON
- [ ] `/` carga el SPA (React app)
- [ ] `/login` carga el SPA (React app)
- [ ] Console muestra configuración correcta de Railway
- [ ] Login con Microsoft completa sin errores
- [ ] Dashboard carga después de login
- [ ] No hay errores React #310 en consola
- [ ] WebSocket conecta correctamente
- [ ] No hay errores 404 en Network tab

---

**Fecha de última actualización:** 2025-10-11  
**Commits relevantes:**
- `bec8de7` - Remove prestart, add frontend verification
- `524cca5` - Use dynamic redirectUri from railway config
