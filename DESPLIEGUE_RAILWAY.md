# 🚀 Despliegue en Railway.app - Guía Paso a Paso

## ✅ Estado Actual
- ✅ Código subido a GitHub: https://github.com/Alanrele/finsmart
- ✅ Dockerfile configurado para Railway (Node.js 20)
- ✅ railway.yml configurado
- ✅ Variables de entorno separadas (seguras)
- ✅ Package locks regenerados y sincronizados

## 📋 Pasos para Desplegar en Railway

### 1. 🌐 Acceder a Railway
1. Ve a https://railway.app
2. Inicia sesión con tu cuenta de GitHub
3. Autoriza el acceso a tu repositorio

### 2. 🔗 Conectar Repositorio
1. Click en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Busca y selecciona `Alanrele/finsmart`
4. Railway detectará automáticamente el Dockerfile

### 3. 🔐 Configurar Variables de Entorno
En el dashboard de Railway, ve a "Variables" y agrega:

```env
OPENAI_API_KEY=your_openai_api_key_here
AZURE_OCR_KEY=your_azure_ocr_key_here
AZURE_OCR_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_here
AZURE_CLIENT_ID=29f56526-69dc-4e89-9955-060aa8292fd0
AZURE_TENANT_ID=common
NODE_ENV=production
PORT=5000
```

> ⚠️ **Importante**: Usa las claves reales del archivo `CLAVES_REALES.md`

### 4. 🏗️ Proceso de Construcción
Railway automáticamente:
- ✅ Detectará el Dockerfile (Node.js 20 Alpine)
- ✅ Construirá la imagen Docker multi-stage con dependencias nativas
- ✅ Instalará dependencias del frontend y backend (sincronizadas)
- ✅ Generará build de producción del React
- ✅ Configurará el servidor Express para servir estáticos
- ✅ Ejecutará como usuario no-root por seguridad

> 💡 **Si el build falla**: Railway incluye un `Dockerfile.simple` como alternativa más básica.

### 5. 🌍 Acceso a la Aplicación
- Railway te dará una URL tipo: `https://finsmart-production-XXXX.up.railway.app`
- La aplicación estará disponible con HTTPS automático
- El login de Microsoft funcionará correctamente en producción

### 6. 🔍 Monitoreo
- Ve los logs en tiempo real en Railway dashboard
- Monitorea el uso de recursos
- Configura alertas si es necesario

## 🎯 Características de la App Desplegada

### 🏠 Frontend (React PWA)
- ✅ Interfaz moderna con TailwindCSS
- ✅ Progressive Web App (instalable)
- ✅ Autenticación Microsoft MSAL
- ✅ Chat con IA integrado
- ✅ Análisis financiero automatizado
- ✅ Dashboard responsive

### ⚙️ Backend (Node.js)
- ✅ API REST completa
- ✅ Autenticación JWT + Microsoft Graph
- ✅ Integración OpenAI para análisis IA
- ✅ Azure OCR para procesamiento documentos
- ✅ Base de datos MongoDB Atlas
- ✅ Middleware de seguridad

### 🔐 Seguridad
- ✅ HTTPS automático en Railway
- ✅ Variables de entorno seguras
- ✅ Autenticación Microsoft Azure AD
- ✅ JWT tokens seguros
- ✅ CORS configurado

## 📱 Uso de la Aplicación

1. **Login**: Autenticación con cuenta Microsoft
2. **Dashboard**: Vista general de finanzas
3. **Transacciones**: Gestión de movimientos financieros
4. **Chat IA**: Asistente financiero inteligente
5. **Análisis**: Procesamiento de documentos con OCR
6. **Configuración**: Personalización de la cuenta

## 🔗 URLs Importantes

- **GitHub Repository**: https://github.com/Alanrele/finsmart
- **Railway Dashboard**: https://railway.app/dashboard
- **App en Producción**: Se generará después del despliegue

## 💡 Notas Finales

- La aplicación se actualiza automáticamente con cada push a GitHub
- Las variables de entorno están seguras en Railway
- El código público en GitHub no contiene información sensible
- La app es completamente funcional y lista para producción

### 🔧 Troubleshooting

**Si el build falla con el Dockerfile principal:**
1. En Railway dashboard, ve a Settings > Environment
2. Agrega variable: `DOCKERFILE_PATH=Dockerfile.simple`  
3. Redeploy el proyecto

**Verificar logs del build:**
- Ve a Deployments en Railway dashboard
- Click en el deployment fallido para ver logs detallados
- Los errores más comunes están relacionados con dependencias npm

¡Tu FinSmart PWA está listo para el mundo! 🌟
