# 🚀 FinSmart - Despliegue en Railway.com

## 📋 Preparación Completa para Railway

### ✅ **Archivos de Configuración Creados**

1. **Dockerfile** - Construcción multi-stage optimizada
2. **railway.yml** - Configuración específica de Railway
3. **package.json** - Scripts de construcción y despliegue
4. **.env.production** - Variables de entorno para producción
5. **.gitignore** - Archivos excluidos del repositorio
6. **Git repository** - Inicializado y con commit inicial

### 🛠️ **Pasos para Desplegar**

#### 1. **Crear cuenta en Railway.com**
```bash
# Ve a: https://railway.app
# Conecta tu cuenta de GitHub
```

#### 2. **Conectar repositorio**
```bash
# Opción A: Subir a GitHub primero
git remote add origin https://github.com/TU_USUARIO/finsmart.git
git branch -M main
git push -u origin main

# Opción B: Railway desde código local
railway login
railway init
railway up
```

#### 3. **Configurar variables de entorno en Railway**

En el dashboard de Railway, agrega estas variables:

```env
# Database
MONGODB_URI=mongodb+srv://miusuario:Alan12345@cluster0.goboze9.mongodb.net/finsmart

# JWT
JWT_SECRET=finsmart_jwt_secret_2024_production_ready_railway_deployment

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Azure OCR
AZURE_OCR_KEY=your_azure_ocr_key_here
AZURE_OCR_ENDPOINT=https://your-resource.cognitiveservices.azure.com/

# Microsoft Graph
AZURE_CLIENT_ID=29f56526-69dc-4e89-9955-060aa8292fd0
AZURE_TENANT_ID=common

# Server
NODE_ENV=production
PORT=5000
```

#### 4. **Actualizar Azure AD con URL de Railway**

Una vez desplegado, Railway te dará una URL como:
```
https://finsmart-production-xxxx.up.railway.app
```

**Actualizar en Azure Portal:**
1. Azure Active Directory → App registrations
2. Buscar Client ID: `29f56526-69dc-4e89-9955-060aa8292fd0`
3. Authentication → Single-page application
4. **Agregar URIs**:
   - `https://finsmart-production-xxxx.up.railway.app`
   - `https://finsmart-production-xxxx.up.railway.app/auth-callback`

### 🎯 **Comandos Railway CLI**

#### Instalación:
```bash
npm install -g @railway/cli
railway login
```

#### Despliegue directo:
```bash
cd "C:\Proyectos\PAIR-BCP"
railway init
railway up
```

#### Monitoreo:
```bash
railway logs
railway status
railway open
```

### 🌐 **Configuración Automática**

El proyecto está configurado para:

- ✅ **Construcción automática** del frontend
- ✅ **Servir archivos estáticos** desde el backend
- ✅ **Variables de entorno** listas para Railway
- ✅ **Puerto dinámico** (Railway asigna automáticamente)
- ✅ **HTTPS automático** (Railway incluye certificados SSL)
- ✅ **Dominio personalizado** disponible

### 📊 **Estructura de Despliegue**

```
FinSmart en Railway:
├── Build: npm run build (construye frontend)
├── Start: npm start (inicia backend + sirve frontend)
├── Port: $PORT (asignado por Railway)
├── Domain: https://finsmart-production-xxxx.up.railway.app
└── SSL: Automático ✅
```

### 🔐 **Beneficios de Railway**

1. **HTTPS Automático** - Microsoft Login funcionará inmediatamente
2. **Dominio incluido** - No necesitas configurar DNS
3. **Escalado automático** - Se adapta al tráfico
4. **Logs centralizados** - Monitoreo fácil
5. **Git deployment** - Push to deploy
6. **Base de datos** - Puede hospedar PostgreSQL si necesitas

### 🎉 **Resultado Final**

Una vez desplegado tendrás:

- ✅ **App completa** en HTTPS
- ✅ **Microsoft Login** funcional
- ✅ **Todas las APIs** operativas
- ✅ **PWA instalable** desde el navegador
- ✅ **Dominio público** para compartir

---

## 🚀 **Inicio Rápido**

```bash
# 1. Subir a GitHub
git remote add origin https://github.com/TU_USUARIO/finsmart.git
git push -u origin main

# 2. Railway
# - Ve a railway.app
# - Connect GitHub repo
# - Deploy automáticamente

# 3. Actualizar Azure AD con la nueva URL
# 4. ¡Listo! 🎉
```

**Tu app estará disponible en unos minutos con HTTPS y Microsoft Login funcionando.**
