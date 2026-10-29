# SIST · Soporte Técnico FCQI UABC

Frontend Next.js 15 / React 19 conectado al backend Express de `../Back-End-SIST`. Implementa los cuatro roles de la API, con el diseño institucional de la guía: verde `#00723F`, ocre `#DD971A`, azul `#20419A`, escudo oficial actualizado 2022, controles de 44 px, navegación adaptable y formularios accesibles.

## Iniciar el entorno

Requiere Node.js 22 o posterior y PostgreSQL para el backend. Durante la implementación se dejó Node portátil en `../.tools/node-v22.23.4-win-x64`. Si Node no está en el PATH de PowerShell, desde esta carpeta puedes habilitarlo para la terminal actual:

```powershell
$env:Path = (Resolve-Path '../.tools/node-v22.23.4-win-x64').Path + ';' + $env:Path
```

1. Prepara el backend según `../Back-End-SIST/docs/DEPLOYMENT.md` y su `.env.example`. Configura PostgreSQL, un `JWT_SECRET` de al menos 32 caracteres, credenciales OAuth de Google y estos valores:

   ```dotenv
   PORT=3000
   FRONTEND_URL=http://localhost:3001
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback
   ALLOWED_EMAIL_DOMAINS=uabc.edu.mx
   APP_TIMEZONE=America/Tijuana
   ```

   Registra el callback exacto en la configuración del cliente Google. Genera Prisma, aplica migraciones, carga el catálogo y levanta la API desde `Back-End-SIST`:

   ```powershell
   pnpm install --frozen-lockfile
   pnpm prisma:generate
   pnpm db:migrate
   pnpm db:seed
   pnpm dev
   ```

2. En otra terminal, desde `Proyecto-SIST`:

   ```powershell
   Copy-Item .env.example .env.local
   npm ci
   npm run dev
   ```

3. Abre **http://localhost:3001**. El acceso redirige a Google mediante la API en **http://localhost:3000**. No hay acceso simulado ni cuentas de demostración.

`NEXT_PUBLIC_API_URL` recibe el origen de la API, sin `/api/v1`. `NEXT_PUBLIC_APP_TIMEZONE` debe coincidir con `APP_TIMEZONE` del backend. Las variables públicas se incorporan al compilar; si cambian, reinicia desarrollo o vuelve a compilar producción.

## Pantallas y permisos

| Rol              | Pantallas                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usuario          | `/usuario`, `/usuario/nuevo`, `/usuario/tickets`, `/usuario/tickets/[id]`                                                                          |
| Soporte          | `/soporte`, `/soporte/tickets`, `/soporte/tickets/[id]`, `/soporte/bitacora` (consulta)                                                            |
| Subencargado     | Todas las de soporte, registro/edición/historial de bitácora y `/soporte/inventario`                                                               |
| Administrador    | `/admin`, `/admin/tickets`, `/admin/tickets/[id]`, `/admin/bitacora`, `/admin/inventario`, `/admin/equipo`, `/admin/categorias`, `/admin/reportes` |
| Cualquier sesión | `/perfil`, `/ayuda`                                                                                                                                |
| Acceso           | `/`, `/auth/success`, `/auth/complete-profile`                                                                                                     |

Los detalles de equipos, incidencias anteriores, entradas de bitácora y sus revisiones se abren en diálogos accesibles. La navegación y las acciones se derivan del rol devuelto por `/auth/me`; el servidor sigue siendo la autoridad de permisos.

## Integración

- `lib/api.ts` centraliza `credentials: 'include'`, prefijo `/api/v1`, respuestas `data/meta`, errores por campo y respuestas vacías 204. La sesión permanece en cookies HttpOnly; no se guardan tokens en JavaScript.
- `lib/hooks.ts` cancela consultas obsoletas y conserva metadatos de paginación. Los datos provienen del backend; se eliminó el almacenamiento JSON y las incidencias de ejemplo.
- Categorías y subcategorías se cargan del catálogo. La prioridad la asigna el servidor; software solicita versión, descarga y autorización de coordinación. La descripción admite hasta 50 palabras.
- Los borradores de ticket y bitácora se guardan en `localStorage` aislados por usuario (y registro para edición de bitácora), se restauran al regresar y se eliminan al confirmar el guardado. Un error de red conserva los datos; el envío se realiza manualmente al reconectar. El sitio completo requiere conexión para cargar sus recursos; no es una PWA offline.
- Las transiciones de estado respetan el contrato. Cada intento lógico mantiene su clave de idempotencia al reintentar; completar y cancelar requieren confirmación. Las acciones de tickets terminados quedan ocultas.
- La asignación confirma el cambio cuando la API responde; el correo se procesa en el backend. No se duplica una asignación por demora de SMTP.
- El administrador puede incluir categorías y subcategorías inactivas para reactivarlas. Se corrigió el repositorio Prisma para respetar ese filtro administrativo.

En producción, usa HTTPS y frontend/API bajo el mismo sitio (por ejemplo, subdominios institucionales) para las cookies `SameSite=Lax`, y configura CORS con el origen exacto del frontend. No se añadió un proxy que cambie el contrato OAuth.

## Comprobaciones

```powershell
npm run typecheck
npm run build
npm start
```

La compilación incluye todas las rutas. La suite del backend se ejecuta con `pnpm test`; las pruebas PostgreSQL requieren `DATABASE_URL_TEST` configurada sobre una base dedicada. OAuth institucional y entrega de correo deben verificarse con credenciales y servicios reales; los ensayos con respuestas controladas no certifican Google, SMTP ni la persistencia de PostgreSQL.

Para los recorridos en navegador, inicia `npm start`, deja libre el puerto 3000 y ejecuta `npm run test:ui`. La prueba levanta una API temporal con fixtures del contrato y captura escritorio/móvil; revisa [su alcance y configuración](tests/README.md). No uses esta prueba con un backend real ocupando ese puerto.

## Referencias

- [Matriz del PDF y guía visual](docs/REQUIREMENTS.md).
- [Contrato de API verificado](docs/BACKEND_REFERENCE.md).
- [Resultados de validación y límites](docs/VALIDATION.md).
- [Guía original de integración](../Back-End-SIST/docs/FRONTEND_INTEGRATION.md).
- [Contrato original del backend](../Back-End-SIST/docs/BACKEND_CONTRACT.md).

El escudo en `public/uabc-escudo.png` es el archivo oficial sin alterar, referenciado en la matriz. Proxima Nova es la fuente objetivo: puede alojarse con licencia en `public/fonts`; mientras no se proporcione, la interfaz usa las fuentes locales de respaldo sin descargar fuentes externas.
