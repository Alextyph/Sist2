# Validación de la interfaz e integración

Verificación realizada el 29 de octubre de 2026 en Windows, con Node.js 22.23.4 y Next.js 15.5.27.

| Comprobación | Resultado |
| --- | --- |
| TypeScript frontend (`npm run typecheck`) | Aprobado |
| Compilación de producción (`npm run build`) | Aprobada, sin advertencias; todas las rutas generadas |
| HTTP de acceso y escudo oficial | 200 |
| Recorridos en Edge/Chromium (`npm run test:ui`) | 30 aprobados, 0 fallos, 0 excepciones JavaScript |
| Transporte navegador → API de prueba | 84 solicitudes; CORS con origen explícito y cookies; 4 mutaciones de prueba |
| Capturas revisadas | 15 capturas de escritorio y móvil |
| TypeScript backend | Aprobado |
| Suite completa del backend (`pnpm test`) | 133 pruebas aprobadas; 90 omitidas por no configurar `DATABASE_URL_TEST` |

## Cobertura en navegador

La suite utiliza una API HTTP temporal con respuestas basadas en el contrato del repositorio. Cubre acceso institucional, retorno OAuth y consulta única de sesión, navegación de los cuatro roles, aviso de permiso denegado, filtros y paginación, campos obligatorios, límite de 50 palabras, campos de software y autorización, creación y detalle de tickets, bitácora de solo lectura para soporte, inventario y sus incidencias, categorías, equipo, reportes y sus filtros.

También comprueba restauración de borradores de ticket y bitácora tras una desconexión, confirmación de resolución, conservación de `Idempotency-Key` al reintentar, foco de diálogos, navegación móvil con Escape y devolución del foco, y ausencia de desbordamiento horizontal a 390 px. La API de prueba se cierra al finalizar y no modifica PostgreSQL ni se incluye en el código de producción.

El resultado detallado está en `tests/artifacts/smoke-results.json` y las capturas en esa misma carpeta, ignorada por Git. Se regeneran al ejecutar la suite; representan datos de prueba, no actividad institucional real. [Instrucciones de reproducción](../tests/README.md).

## Integraciones pendientes de entorno

- Las 90 pruebas PostgreSQL necesitan una base dedicada configurada en `DATABASE_URL_TEST`. No se ha verificado la persistencia real de la aplicación en este entorno.
- Google OAuth institucional requiere credenciales, dominios y callback autorizados. No se ha iniciado sesión con una cuenta institucional real.
- La entrega SMTP requiere configurar y comprobar el servicio de correo.
- Disponibilidad, concurrencia, latencias, respaldos y recuperación requieren pruebas de infraestructura; la compilación y las pruebas funcionales no certifican esos atributos.

## Corrección necesaria en el backend

El listado administrativo de categorías ahora incluye subcategorías inactivas cuando `includeInactive=true`, permitiendo encontrarlas y reactivarlas. El catálogo ordinario conserva únicamente las activas. Se añadieron comprobaciones del ciclo desactivar → consultar → reactivar y de los permisos del filtro en la integración de autenticación (aprobada), además de su equivalente PostgreSQL (pendiente de base de pruebas).
