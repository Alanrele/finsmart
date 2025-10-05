# 🚀 GitHub Repository Setup - FinSmart

## 📋 Instrucciones para crear repositorio en GitHub

### 1. **Crear repositorio en GitHub.com**

1. Ve a: https://github.com
2. Clic en **"New repository"** (botón verde)
3. **Repository name**: `finsmart` o `PAIR-BCP-FinSmart`
4. **Description**: `FinSmart - Análisis Financiero Inteligente con IA | PWA Full-Stack con React + Node.js + OpenAI + Azure`
5. **Visibility**: Public (para que Railway pueda acceder)
6. **NO** marques "Add a README file" (ya tenemos uno)
7. **NO** marques "Add .gitignore" (ya tenemos uno)
8. **NO** marques "Choose a license" (opcional)
9. Clic en **"Create repository"**

### 2. **Copiar URL del repositorio**

GitHub te mostrará una página con comandos. Copia la URL que aparece después de:
```
git remote add origin https://github.com/TU_USUARIO/finsmart.git
```

### 3. **Comandos a ejecutar**

Una vez tengas la URL, usa estos comandos:

```bash
# Conectar repositorio local con GitHub
git remote add origin https://github.com/TU_USUARIO/finsmart.git

# Renombrar rama a 'main' (estándar actual)
git branch -M main

# Subir código a GitHub
git push -u origin main
```

## 🎯 **Ejemplo completo**

Si tu usuario de GitHub es "usuario123" y nombraste el repo "finsmart":

```bash
git remote add origin https://github.com/usuario123/finsmart.git
git branch -M main
git push -u origin main
```

## ✅ **Verificación**

Después del push, deberías ver en GitHub:
- ✅ 77+ archivos subidos
- ✅ 3 commits en el historial
- ✅ README.md visible en la página principal
- ✅ Estructura de carpetas: backend/, frontend/, etc.

## 🚀 **Siguiente paso: Railway**

Una vez en GitHub:
1. Ve a: https://railway.app
2. Sign up con tu cuenta de GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Selecciona tu repositorio "finsmart"
5. Railway detectará automáticamente el Dockerfile
6. Configura las variables de entorno
7. ¡Deploy automático en minutos!

---

**¿Necesitas ayuda creando la cuenta de GitHub o tienes alguna duda?**
