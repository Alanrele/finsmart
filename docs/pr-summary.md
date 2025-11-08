# PR: refactor(repo): reorganización hexagonal/FSD + 12‑Factor

Resumen:

- Propuesta y artefactos para reorganizar el backend hacia una arquitectura Hexagonal (domain, app, ports, adapters, infrastructure).
- Propuesta y artefactos para reorganizar el frontend hacia Feature‑Sliced Design (app, pages, features, entities, widgets, shared).
- Scripts para automatizar la migración (dry-run / apply) y verificación de referencias.
- README actualizados para backend/frontend y checklist de verificación.

Archivos añadidos:

- scripts/reorg-finsmart.js  — migración dry-run/--apply.
- scripts/check-refs.js      — escaneo de imports legacy.
- scripts/verify-services.js — ping health endpoints.
- docs/reorg-mapping.md
- docs/refactor-checklist.md
- backend/README.md
- frontend/README.md

Notas de seguimiento:
- Revisar imports dinámicos y templates que el script no puede reescribir con seguridad.
- Ejecutar tests y flujos manuales (MSAL login, email sync) en entorno dev.
- Después de validar, mover/commitear y abrir PR con el árbol final.
