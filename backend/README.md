# Backend - FinSmart

Cómo ejecutar en desarrollo:

1. Sitúate en la carpeta `backend`:

```powershell
Set-Location 'D:\Proyectos Personales\finsmart\backend'
npm install
npm run dev
```

El entrypoint estándar es `src/adapters/http/server.js`.

Variables de entorno requeridas: ver `backend/.env.example`.

Tests:

```powershell
npm test
```
# FinSmart Backend

Node.js + Express API following a hexagonal layout.

## Quick Start

```bash
npm install
npm run dev
```

The server expects a `.env` file based on `.env.example`. MongoDB defaults to `mongodb://localhost:27017/finsmart`.

## Useful Scripts

- `npm run dev` – start the API with nodemon.
- `npm test` – run Jest suites (email parsers).
- `npm run lint` – ensure no legacy import paths remain.
- `node ../scripts/verify-services.js` – ping health endpoints when the server is running.

## Structure Highlights

- `src/domain` – domain entities and schemas.
- `src/app` – application services and use-cases.
- `src/ports` – hexagonal contracts.
- `src/adapters` – HTTP, database, AI, and Microsoft Graph adapters.
- `src/infrastructure` – shared concerns (logging, config, security).
