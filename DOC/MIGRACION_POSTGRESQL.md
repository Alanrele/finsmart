# Migración de MongoDB a PostgreSQL (Prisma)

**Fecha**: 2026-07-04
**Motivo**: el cluster de MongoDB Atlas (`cluster0.goboze9`) dejó de existir (ver `SECURITY_ALERT.md` en `DOC/historial/`). Se decidió migrar a PostgreSQL alojado en Railway.

## Arquitectura

- **ORM**: Prisma 6 (`backend/prisma/schema.prisma`, tablas `users` y `transactions`).
- **Capa de compatibilidad**: `backend/src/models/compat.js` traduce la API de Mongoose
  (find/findOne/findById/findByIdAndUpdate/updateMany/deleteMany/countDocuments/exists/
  aggregate + documentos con `.save()`, `.toJSON()`, `_id`) a Prisma. Gracias a esto,
  **rutas, servicios y middleware no cambiaron su lógica** y los contratos de la API
  son idénticos (los objetos siguen exponiendo `_id`, ahora UUID).
- `userModel.js` y `transactionModel.js` conservan sus rutas de import y su API pública,
  incluido el hash bcrypt automático de contraseñas y las estáticas
  `getMonthlySummary`/`getSpendingTrends`.
- Conexión y health-check: `backend/src/config/prisma.js` (`DATABASE_URL`).

## Qué cambió y qué no

| | Antes | Ahora |
|---|---|---|
| Motor | MongoDB Atlas | PostgreSQL (Railway) |
| Variable de entorno | `MONGODB_URI` | `DATABASE_URL` |
| IDs | ObjectId (string 24 hex) | UUID v4 (string) — los JWT siguen llevando `userId` string |
| `/health` | campo `mongodb` | campo `database` (`engine: postgresql`) |
| Contratos de API | — | **Sin cambios** (mismos campos, `_id` incluido) |
| Datos | — | Base nueva (el cluster viejo ya no existía; no había datos que migrar) |

## Pasos en Railway (los haces tú)

1. En tu proyecto de Railway: **New → Database → PostgreSQL**.
2. Abre el servicio Postgres → pestaña **Variables** → copia `DATABASE_URL`
   (usa la interna `postgres.railway.internal` para el backend en el mismo proyecto).
3. En el servicio del **backend** → **Variables** → agrega `DATABASE_URL` con ese valor.
   Puedes eliminar `MONGODB_URI` (ya no se usa).
4. Redeploy. El script `npm start` ejecuta `prisma migrate deploy` automáticamente
   antes de arrancar, así que las tablas se crean solas.

## Desarrollo local

- Contenedor de desarrollo (el que se usó para verificar la migración):
  ```bash
  docker run -d --name finsmart-pg-test -e POSTGRES_PASSWORD=finsmart_test -e POSTGRES_DB=finsmart -p 5433:5432 postgres:16-alpine
  ```
  y en `backend/.env`: `DATABASE_URL=postgresql://postgres:finsmart_test@localhost:5433/finsmart`
- Migraciones: `npm run prisma:migrate` (desarrollo) / `npm run prisma:deploy` (producción).
- Inspección visual de datos: `npm run prisma:studio`.

## Verificación realizada (contra Postgres 16 local)

- Registro, login (bcrypt), verify (JWT), refresh — OK; `password/accessToken/refreshToken` nunca se exponen en JSON.
- Dashboard, listado de transacciones con paginación/orden/búsqueda insensible a mayúsculas — OK.
- `PATCH /preferences` con rutas punteadas (`preferences.theme`) fusiona sobre el JSON sin perder `currency`/`notifications` — OK.
- Inserción de transacciones estilo email-sync (`new Transaction().save()`), detección de duplicados por `messageId`/`operationNumber`, mutación + `save()` (reprocesamiento) — OK.
- Agregaciones `getMonthlySummary`, `getSpendingTrends`, `/spending/categories`, `/trends` — mismas formas de salida que Mongo — OK.

## Notas / legado

- `backend/scripts/importBCPTransactions.js` es un script one-shot que usa Mongoose
  directamente contra el cluster viejo: quedó **obsoleto** (mongoose se retiró de
  `dependencies`). Candidato a eliminar o reescribir sobre Prisma si se necesita.
- `frontend` no requirió ningún cambio: los contratos de la API se mantuvieron.
