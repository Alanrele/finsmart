# Checklist de refactorización

Pasos para validar la reorganización y aceptación:

1. Ejecutar `node scripts/reorg-finsmart.js --dry-run` y revisar la salida.
2. Ejecutar `node scripts/reorg-finsmart.js --apply` para aplicar los movimientos (hacer commit inmediatamente).
3. Ejecutar `npm --workspace backend run lint` y `npm --workspace frontend run lint`.
4. Levantar backend: `npm --workspace backend run dev` y comprobar `/health`.
5. Levantar frontend: `npm --workspace frontend run dev` y comprobar que la SPA carga y MSAL se inicializa.
6. Ejecutar tests backend: `npm --workspace backend test`.
7. Ejecutar `node scripts/check-refs.js` y corregir cualquier import restante.
8. Ejecutar `node scripts/verify-services.js` para checks rápidos de endpoints.
9. Añadir cambios al PR con descripción y el árbol de carpetas resultante.

Aceptación: todos los pasos anteriores deben pasar. Documentar fallos como follow-ups.
