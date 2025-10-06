# 🚨 SOLUCIÓN RÁPIDA: Error de Microsoft Login

## ❌ Error Actual:
```
invalid_request: The provided value for the input parameter 'redirect_uri' is not valid.
```

## ✅ Solución en 3 Pasos:

### 1. 🌐 Obtener URL de Railway
- Tu app está en: `https://finsmart-production.up.railway.app`
- Esta URL necesita ser registrada en Azure AD

### 2. 🔧 Actualizar Azure AD (URGENTE)
1. **Ve a [Azure Portal](https://portal.azure.com)**
2. **Azure Active Directory** > **App registrations**
3. **Busca Client ID**: `29f56526-69dc-4e89-9955-060aa8292fd0`
4. **Click en "Authentication"**
5. **En "Single-page application"** > **Add URI**
6. **AGREGAR estas 4 URLs:**
   ```
   https://finsmart-production.up.railway.app
   https://finsmart-production.up.railway.app/
   https://localhost:3001
   https://localhost:3001/
   ```
7. **GUARDAR cambios**

### 3. 🔄 Probar Login
- **Espera 2-3 minutos** para propagación
- **Recarga la página** de Railway
- **Intenta login de Microsoft** nuevamente

## 📱 URLs que Deben Estar en Azure AD:

```bash
# Desarrollo
https://localhost:3001
https://localhost:3001/

# Producción Railway  
https://finsmart-production.up.railway.app
https://finsmart-production.up.railway.app/
```

## ⏰ Tiempo Estimado: 5 minutos

**¡Sin esta configuración, Microsoft Login NO funcionará en Railway!** 🚨