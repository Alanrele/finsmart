# Reorganization mapping (origen → destino)

Este documento lista los mapeos aplicados o planeados para reorganizar el repo hacia Hexagonal (backend) y FSD (frontend).

Ejemplos concretos (obligatorios):

- backend/src/server.js → backend/src/adapters/http/server.js
- backend/src/routes/*.js → backend/src/adapters/http/routes/*.js
- backend/src/config/logger.js → backend/src/infrastructure/logging/logger.js
- backend/src/utils/tokenCleanup.js → backend/src/infrastructure/security/tokenCleanup.js
- backend/src/domain/NormalizedTransaction.js → backend/src/domain/transaction/NormalizedTransaction.js
- backend/src/services/transactionDeduper.js → backend/src/app/services/transactionDeduper.js
- backend/src/services/aiAnalysisService.js → backend/src/app/use-cases/analyzeTransaction.js
- backend/src/services/emailSyncService.js → backend/src/adapters/msgraph/emailSyncService.js
- backend/src/lib/email/bcp/** → backend/src/adapters/msgraph/email/bcp/**
- backend/src/models/*.js → backend/src/adapters/db/mongoose/models/*.js + backend/src/adapters/db/mongoose/TransactionRepo.js

- frontend/src/main.jsx → frontend/src/app/index.jsx
- frontend/src/App.jsx → frontend/src/app/app.jsx
- frontend/src/stores/authStore.js → frontend/src/entities/session/model/authStore.js
- frontend/src/stores/appStore.js → frontend/src/entities/app/model/appStore.js
- frontend/src/services/api.js → frontend/src/shared/api/base.js
- frontend/src/services/socket/** → frontend/src/shared/io/socket/**

Nota: el script `scripts/reorg-finsmart.js` contiene un mapeo inicial y puede ampliarse.
