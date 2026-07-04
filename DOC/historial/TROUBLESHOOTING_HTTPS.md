# 🌐 Acceso a HTTPS con Certificado Auto-firmado

## ⚠️ Error "ERR_CONNECTION_REFUSED"

Este error puede ocurrir por varias razones:

### 1. 🔍 Verificar que el servidor esté corriendo

```bash
# En PowerShell, ejecuta:
cd "c:\Proyectos\PAIR-BCP\frontend"
npm run dev
```

**Deberías ver:**
```
✓ Vite v5.4.20 ready in XXXms
➜ Local:   https://localhost:3001/
➜ Network: https://172.25.144.1:3001/
```

### 2. 🛡️ Aceptar Certificado Auto-firmado

#### En Google Chrome:
1. Ve a `https://localhost:3001`
2. Verás: **"Tu conexión no es privada"**
3. Clic en **"Avanzado"**
4. Clic en **"Continuar a localhost (sitio no seguro)"**

#### En Firefox:
1. Ve a `https://localhost:3001`
2. Verás: **"Advertencia: Riesgo potencial de seguridad"**
3. Clic en **"Avanzado"**
4. Clic en **"Aceptar el riesgo y continuar"**

#### En Edge:
1. Ve a `https://localhost:3001`
2. Verás: **"Tu conexión no es privada"**
3. Clic en **"Avanzado"**
4. Clic en **"Continuar a localhost (no recomendado)"**

### 3. 🔧 Alternativas si no funciona

#### Opción A: Usar HTTP temporalmente
```bash
# Edita vite.config.js y comenta la línea https:
server: {
  port: 3000,
  host: true,
  // https: true  // ← Comenta esta línea
}
```

#### Opción B: Usar ngrok para túnel HTTPS
```bash
# Instalar ngrok
npm install -g ngrok

# En una terminal separada:
ngrok http 3001

# Usa la URL https que te proporciona ngrok
```

### 4. 🧪 Verificar Estado del Servidor

```bash
# Desde el directorio raíz del proyecto:
cd "c:\Proyectos\PAIR-BCP"
node check-services.js
```

**Deberías ver:**
```
✅ Frontend (Vite HTTPS) OK         (o ERROR si no conecta)
✅ Backend API          OK         HTTP 200
```

### 5. 📱 URLs para Probar

| Servicio | URL | Estado Esperado |
|----------|-----|-----------------|
| **Frontend** | https://localhost:3001 | App FinSmart |
| **Backend** | http://localhost:5001/api/health | {"status": "ok"} |
| **API Docs** | http://localhost:5001/api/docs | Swagger UI |

### 6. 🚨 Troubleshooting Común

#### Error: Puerto en uso
```bash
# Buscar proceso usando el puerto:
netstat -ano | findstr :3001

# Terminar proceso (reemplaza XXXX con el PID):
taskkill /PID XXXX /F

# Reiniciar servidor:
npm run dev
```

#### Error: Módulos no encontrados
```bash
# Reinstalar dependencias:
cd "c:\Proyectos\PAIR-BCP\frontend"
npm install
npm run dev
```

#### Error: Vite no arranca
```bash
# Limpiar cache y reinstalar:
rm -rf node_modules
rm package-lock.json
npm install
npm run dev
```

### 7. ✅ Verificación Final

Una vez que puedas acceder a `https://localhost:3001`:

1. **Verifica el Debug Widget** (esquina superior derecha)
2. **Prueba el login de desarrollo** (cualquier email/password)
3. **Navega entre páginas** (Dashboard, Transacciones, etc.)
4. **Prueba el Microsoft Login** (una vez configurado Azure AD)

---

## 🎯 Comandos Rápidos

```bash
# 1. Reiniciar frontend
cd "c:\Proyectos\PAIR-BCP\frontend"
npm run dev

# 2. Verificar servicios
cd "c:\Proyectos\PAIR-BCP"
node check-services.js

# 3. Abrir en navegador
# https://localhost:3001
```

**Si sigues teniendo problemas, comparte el mensaje de error exacto para ayuda específica.**
