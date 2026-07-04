# � FinSmart - Asistente Financiero Inteligente

**© 2025 Alan Reyes Leandro – Todos los derechos reservados**
*Tu asistente financiero personal con inteligencia artificial*

---

## 🌟 Descripción

FinSmart es una Progressive Web Application (PWA) completa para gestión financiera inteligente, que combina autenticación Microsoft, inteligencia artificial y análisis automatizado de documentos.

## 🆕 Nuevas Características (v2.0)

### 🏠 Pantalla de Bienvenida
- Hero animado con diseño moderno y profesional
- Acceso directo a login/registro mediante modal no intrusivo
- Animaciones suaves con Framer Motion
- Features destacadas con íconos animados

### 🔓 Modal de Login/Registro
- Formulario elegante no intrusivo
- Toggle entre login y registro sin recargar página
- Validaciones en tiempo real
- Soporte para correo + Microsoft Auth en un solo lugar

### 🛡️ Propiedad Intelectual
- Encabezados de copyright en todos los archivos fuente
- LICENSE file con términos legales completos
- Protección de marca "FinSmart"
- Documentación de derechos de autor

## 🔗 Enlaces Importantes

### Producción
- **🌐 Aplicación**: https://finsmart.up.railway.app
- **📊 Health Check**: https://finsmart.up.railway.app/health
- **🚂 Railway Dashboard**: https://railway.app/dashboard

### Documentación
- **🎨 Guía de Estilo (UI)**: [DOC/GUIA_DE_ESTILO.md](./DOC/GUIA_DE_ESTILO.md)
- **🗂️ Plan de Refactor**: [DOC/PLAN_REFACTOR.md](./DOC/PLAN_REFACTOR.md)
- **🚀 Guía de Despliegue Railway**: [DOC/historial/DESPLIEGUE_RAILWAY.md](./DOC/historial/DESPLIEGUE_RAILWAY.md)
- **🔍 Diagnóstico y Troubleshooting**: [DOC/historial/RAILWAY_DIAGNOSTIC.md](./DOC/historial/RAILWAY_DIAGNOSTIC.md)
- **🔒 Variables de Entorno**: `CLAVES_REALES.md` (archivo local, fuera de git)
- **📖 Configuración Azure AD**: [DOC/historial/AZURE_AD_SETUP.md](./DOC/historial/AZURE_AD_SETUP.md)
- **📚 Historial de fixes y features**: carpeta [DOC/historial/](./DOC/historial/)

### Verificación Rápida
```bash
# PowerShell (Windows)
.\scripts\check-deployment.ps1

# Bash (Linux/Mac)
bash scripts/check-deployment.sh
```

### Desarrollo Local
- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:5001
- **API Docs**: http://localhost:5001/api/docs

### 📋 Client ID
- Configurable vía `VITE_AZURE_CLIENT_ID` en `frontend/.env` (ver `frontend/.env.example`); si no se define, se usa el valor por defecto registrado en `src/config/msalConfig.js`.

## ✨ Características Principales

- 🔐 **Autenticación Microsoft**: Login seguro con Azure AD
- 🤖 **IA Integrada**: Asistente financiero con OpenAI
- 📊 **Análisis Automático**: Procesamiento de documentos con Azure OCR
- 📱 **PWA**: Aplicación instalable y con soporte offline
- ⚡ **Tecnología Moderna**: React 18, Node.js, MongoDB Atlas
- 🚀 **Producción Ready**: Desplegable en Railway.com

## 🚀 Características Principales

### 💰 Análisis Financiero Automático
- **Integración con Microsoft Outlook**: Conecta tu cuenta para leer correos del BCP
- **Extracción inteligente**: Utiliza Azure OCR y OpenAI para procesar correos e imágenes
- **Categorización automática**: Clasifica transacciones por tipo y categoría
- **Dashboard interactivo**: Visualiza tus gastos con gráficos intuitivos
- **🔄 Reprocesamiento Inteligente**: Mejora histórica de datos con algoritmos avanzados
  - Revisa todos los correos BCP de hasta 1 año atrás
  - Encuentra transacciones que pasaron desapercibidas
  - Corrige errores de algoritmos anteriores
  - Procesa tanto gastos como ingresos históricos
  - Actualiza solo cuando hay cambios significativos

### 🤖 Inteligencia Artificial
- **Chat financiero**: Pregunta sobre tus finanzas y recibe respuestas personalizadas
- **Análisis predictivo**: Proyecciones de gastos futuros basadas en historial
- **Recomendaciones personalizadas**: Consejos específicos para mejorar tus finanzas
- **Insights automáticos**: Identifica patrones y tendencias en tus gastos

### 📱 Experiencia Móvil
- **PWA completa**: Instalable como app nativa en móviles
- **Diseño responsive**: Optimizado para todos los dispositivos
- **Modo offline**: Funcionalidad básica sin conexión
- **Notificaciones push**: Alertas en tiempo real

### 🔒 Seguridad y Privacidad
- **Autenticación segura**: JWT + OAuth 2.0 con Microsoft
- **Datos encriptados**: Comunicación segura entre cliente y servidor
- **Privacidad garantizada**: Solo procesa correos específicos del BCP
- **Control total**: Desconexión y eliminación de datos en cualquier momento

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** con Vite para desarrollo rápido
- **TailwindCSS** para estilos responsive
- **Framer Motion** para animaciones fluidas
- **Zustand** para gestión de estado
- **Recharts** para visualización de datos
- **Socket.io-client** para actualizaciones en tiempo real

### Backend
- **Node.js** con Express para API REST
- **MongoDB** con Mongoose para base de datos
- **Microsoft Graph SDK** para integración con Outlook
- **Azure Computer Vision** para OCR de imágenes
- **OpenAI API** para análisis e insights con IA
- **Socket.io** para comunicación en tiempo real

### Servicios Cloud
- **Microsoft Graph API** - Acceso a correos de Outlook
- **Azure Cognitive Services** - OCR para procesar imágenes
- **OpenAI GPT-4** - Análisis inteligente y chat

## 🗂️ Estructura del Proyecto

```
PAIR-BCP/
├── DOC/                    # Documentación (guía de estilo, plan de refactor, historial)
│   └── historial/          # Docs históricos de deploys, fixes y features
├── backend/                # API Node.js/Express (config, domain, routes, services, ...)
├── frontend/
│   └── src/
│       ├── pages/          # Vistas de ruta: Dashboard, Transactions, Analysis, ChatIA,
│       │                   # EnhancedAIAssistant, FinancialTools, OutlookConnect,
│       │                   # Settings, Login, WelcomeScreen
│       ├── components/
│       │   ├── layout/     # Layout, Navbar, Sidebar, NotificationPanel
│       │   ├── auth/       # AuthCallback, LoginDialog, MSALInitializing
│       │   ├── common/     # ErrorBoundary, LoadingCard/Screen, ConnectivityStatus, SSL
│       │   ├── dashboard/  # EnhancedCharts, EmailSyncControl
│       │   ├── transactions/ # TransactionDetailModal
│       │   └── debug/      # Paneles de debug (activables con ?debug=1 o Ctrl+Alt+D)
│       ├── config/         # msalConfig, railway
│       ├── hooks/          # useMicrosoftAuth
│       ├── services/       # api (axios), socket (socket.io)
│       ├── stores/         # appStore, authStore (zustand)
│       ├── styles/         # index.css (tokens de la paleta + clases de la guía)
│       └── utils/          # formatters
├── infra/                  # Bicep para Azure
└── scripts/                # Scripts de verificación de despliegue
```

La paleta oficial y los lineamientos visuales están en [DOC/GUIA_DE_ESTILO.md](./DOC/GUIA_DE_ESTILO.md):
arena `#D4CBB0`, taupe `#A79E82`, salvia `#A6C0B4` y azul petróleo `#3F7079` (primario/CTA),
definidos como tokens en `frontend/tailwind.config.js` y variables en `frontend/src/styles/index.css`.

## 📋 Requisitos Previos

- **Node.js** 16+ y npm
- **MongoDB** (local o Atlas)
- **Cuenta de Azure** con App Registration
- **API Key de OpenAI**
- **Cuenta de Microsoft** (para pruebas)

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/finsmart.git
cd finsmart
```

### 2. Configurar Backend

```bash
cd backend
npm install
```

Crea el archivo `.env` basado en `.env.example`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/finsmart

# JWT Secret
JWT_SECRET=tu_clave_secreta_jwt_muy_larga_y_segura

# OpenAI Configuration
OPENAI_API_KEY=tu_openai_api_key

# Azure Configuration
AZURE_OCR_KEY=tu_azure_computer_vision_key
AZURE_OCR_ENDPOINT=https://tu-region.cognitiveservices.azure.com/

# Microsoft Graph Configuration
AZURE_CLIENT_ID=tu_azure_app_client_id
AZURE_CLIENT_SECRET=tu_azure_app_client_secret
AZURE_TENANT_ID=tu_azure_tenant_id

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 3. Configurar Frontend

```bash
cd ../frontend
npm install
```

Crea el archivo `.env` basado en `.env.example`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_AZURE_CLIENT_ID=tu_azure_app_client_id
VITE_AZURE_TENANT_ID=tu_azure_tenant_id
```

### 4. Configurar Azure App Registration

1. Ve a [Azure Portal](https://portal.azure.com)
2. Navega a **Azure Active Directory** → **App registrations**
3. Crea una nueva aplicación:
   - **Name**: FinSmart
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Web → `http://localhost:3000`

4. Después de crear la app:
   - Copia el **Application (client) ID**
   - Copia el **Directory (tenant) ID**
   - Ve a **Certificates & secrets** → **New client secret**
   - Copia el valor del secret

5. Configurar permisos API:
   - Ve a **API permissions**
   - Agrega permisos para **Microsoft Graph**:
     - `User.Read`
     - `Mail.Read`
     - `Mail.ReadBasic`
   - Otorga consentimiento de administrador

### 5. Configurar Azure Computer Vision

1. En Azure Portal, crea un recurso **Computer Vision**
2. Copia la **Key** y **Endpoint**
3. Agrega estos valores a tu archivo `.env` del backend

### 6. Configurar OpenAI

1. Ve a [OpenAI Platform](https://platform.openai.com)
2. Crea una API Key
3. Agrega la key a tu archivo `.env` del backend

## 🏃‍♂️ Ejecutar la Aplicación

### Desarrollo Local

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### Producción

```bash
# Backend
cd backend
npm start

# Frontend (construir para producción)
cd frontend
npm run build
npm run preview
```

## 🎯 Uso de la Aplicación

### 1. Registro/Login
- Crea una cuenta con email y contraseña
- O inicia sesión con tu cuenta de Microsoft

### 2. Conectar Outlook
- Ve a la sección "Outlook"
- Autoriza el acceso a tu cuenta de Microsoft
- La app comenzará a sincronizar correos del BCP automáticamente

### 3. Ver Dashboard
- Observa el resumen de tus finanzas
- Revisa gráficos de gastos por categoría
- Analiza tendencias mensuales

### 4. Chat con IA
- Haz preguntas sobre tus finanzas
- Recibe consejos personalizados
- Solicita análisis específicos

### 5. Análisis Detallado
- Revisa insights generados por IA
- Implementa recomendaciones de ahorro
- Monitorea tu progreso financiero

## 🔧 Configuración Avanzada

### Variables de Entorno Adicionales

#### Backend
```env
# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

#### Frontend
```env
# Analytics (opcional)
VITE_ANALYTICS_ID=tu_analytics_id

# Feature flags
VITE_ENABLE_PWA=true
VITE_ENABLE_NOTIFICATIONS=true
```

### Configuración de Base de Datos

#### MongoDB Local
```bash
# Instalar MongoDB
brew install mongodb/brew/mongodb-community  # macOS
# o seguir instrucciones para tu OS

# Iniciar MongoDB
brew services start mongodb/brew/mongodb-community
```

#### MongoDB Atlas
1. Crea una cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crea un cluster gratuito
3. Obtén la cadena de conexión
4. Actualiza `MONGODB_URI` en tu `.env`

## 📱 Instalación como PWA

### En Móvil
1. Abre la app en tu navegador móvil
2. Toca el menú del navegador
3. Selecciona "Agregar a pantalla de inicio"
4. La app se instalará como aplicación nativa

### En Desktop
1. Visita la app en Chrome/Edge
2. Busca el ícono de instalación en la barra de direcciones
3. Haz clic en "Instalar FinSmart"

## 🧪 Testing

### Backend
```bash
cd backend
npm test
```

### Frontend
```bash
cd frontend
npm run test
```

### E2E Testing
```bash
npm run test:e2e
```

## 🚀 Deployment

### Vercel (Frontend)
1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Deploy automático en cada push

### Heroku (Backend)
1. Crea una app en Heroku
2. Configura las variables de entorno
3. Deploy con Git

### Docker
```bash
# Construir imágenes
docker-compose build

# Ejecutar servicios
docker-compose up
```

## 🔒 Seguridad

### Mejores Prácticas Implementadas
- **JWT tokens** con expiración automática
- **Rate limiting** para prevenir ataques
- **Validación de entrada** en todas las rutas
- **Sanitización de datos** antes de almacenar
- **HTTPS** obligatorio en producción
- **CORS** configurado correctamente

### Recomendaciones Adicionales
- Usa secretos robustos en producción
- Implementa monitoreo de seguridad
- Mantén dependencias actualizadas
- Realiza auditorías regulares

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

### Problemas Comunes

#### Error de Conexión con Outlook
- Verifica que las credenciales de Azure estén correctas
- Confirma que los permisos de API estén otorgados
- Revisa que la URL de redirect esté configurada

#### OpenAI API Error
- Verifica que tu API key sea válida
- Confirma que tengas créditos disponibles
- Revisa los límites de rate limiting

#### Error de Base de Datos
- Confirma que MongoDB esté ejecutándose
- Verifica la cadena de conexión
- Revisa los logs del servidor

### Contacto
- **Email**: soporte@finsmart.com
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/finsmart/issues)
- **Documentación**: [Wiki del proyecto](https://github.com/tu-usuario/finsmart/wiki)

## 🙏 Agradecimientos

- **Microsoft Graph API** por la integración con Outlook
- **OpenAI** por las capacidades de IA
- **Azure** por los servicios de OCR
- **Comunidad de React** por las librerías utilizadas

---

**FinSmart** - Transforma tus correos del BCP en insights financieros inteligentes 🚀💰
