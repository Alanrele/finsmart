# Proyecto FinSmart - Revisión Técnica

## Resumen General
FinSmart es una PWA enfocada en gestión financiera que combina autenticación Microsoft, análisis con IA y procesamiento automatizado de correos del BCP. La documentación raíz resume las capacidades clave (autenticación Azure AD, análisis con OpenAI/Azure OCR, dashboards, despliegue en Railway) y detalla requisitos de infraestructura y configuración local para backend y frontend.【F:README.md†L1-L200】

## Backend
### Arquitectura y seguridad
El servidor Express centraliza la inicialización de dependencias (Helmet, CORS, sockets, conexión a MongoDB) y aplica manejadores globales para excepciones no controladas. Define rutas protegidas para autenticación, Microsoft Graph, IA y finanzas, además de un healthcheck enriquecido que expone configuración de servicios externos y métricas de Socket.IO.【F:backend/src/server.js†L1-L160】【F:backend/src/server.js†L200-L347】

### Modelos de datos
El modelo `User` gestiona credenciales locales y tokens de Microsoft, incluye preferencias de uso y utilidades para hash/rehidratación segura. El modelo `Transaction` captura transacciones normalizadas con metadatos de categorización, índices para consultas por usuario/fecha/categoría y agregaciones para resúmenes mensuales y tendencias de gasto.【F:backend/src/models/userModel.js†L1-L114】【F:backend/src/models/transactionModel.js†L1-L157】

### Servicios y automatización
`EmailSyncService` orquesta la sincronización periódica de correos BCP con Microsoft Graph, implementa estrategias de consulta progresivas y utiliza utilidades de análisis (parser y Azure OCR) con reporting granular por usuario. `AIAnalysisService` inicializa OpenAI de forma defensiva, valida la API key y expone métodos de extracción de transacciones y generación de insights con prompts específicos para el dominio financiero peruano.【F:backend/src/services/emailSyncService.js†L1-L200】【F:backend/src/services/aiAnalysisService.js†L1-L200】

## Frontend
### Ruteo y ciclo de vida
`App.jsx` define la navegación principal con rutas protegidas, callbacks de MSAL y paneles de depuración. Gestiona rehidratación de sesión, seguimiento de actividad para expiración automática y conexión a Socket.IO para notificaciones en tiempo real, además de exponer banderas de depuración persistentes.【F:frontend/src/App.jsx†L1-L200】

### Gestión de estado
La tienda de autenticación con Zustand mantiene credenciales, control de sesión y utilidades para cabeceras y limpieza automática al expirar. La tienda de aplicación coordina tema, datos del dashboard, transacciones, análisis de IA, notificaciones y chat, persistiendo preferencias clave en `localStorage` y sincronizando con el DOM para aplicar temas.【F:frontend/src/stores/authStore.js†L1-L88】【F:frontend/src/stores/appStore.js†L1-L140】

## Infraestructura y despliegue
El template Bicep provisiona un entorno completo en Azure Container Apps con registro de contenedores, Key Vault, Application Insights/Log Analytics y Managed Identity compartida, configurando exposiciones públicas, políticas CORS y variables/secrets para frontend y backend.【F:infra/main.bicep†L1-L200】

## Calidad y pruebas
El backend incluye pruebas unitarias de parsing de correos BCP. La ejecución de `npm test` confirma que los escenarios de clasificación se validan correctamente.【af63b8†L1-L11】

## Oportunidades de mejora
- `setAiAnalysis` asigna una variable inexistente al actualizar el estado, por lo que el análisis nunca se guarda; debería utilizar el parámetro `analysis` en la asignación (`set({ aiAnalysis: analysis, ... })`).【F:frontend/src/stores/appStore.js†L75-L80】
- Los manejadores globales de `uncaughtException`/`unhandledRejection` terminan el proceso inmediatamente, lo que puede provocar caídas completas en producción ante errores recuperables; convendría delegar a un logger/alerting y permitir que el orquestador reinicie el contenedor de forma controlada.【F:backend/src/server.js†L8-L18】
- El healthcheck expone si claves sensibles están configuradas; considerar limitar dicha información o protegerla detrás de autenticación para evitar filtración de estado de configuración en entornos públicos.【F:backend/src/server.js†L113-L161】
