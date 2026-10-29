# Contrato de integración del frontend SIST

Referencia de implementación derivada del código de `Back-End-SIST` y sus documentos `FRONTEND_INTEGRATION.md`, `AUTH.md`, `API.md` y `BACKEND_CONTRACT.md`. El backend es la autoridad de validación, permisos, identidad y datos. No sustituye la documentación completa de la API.

## Entorno y transporte

- Backend: `http://localhost:3000`; frontend: `http://localhost:3001` conforme a `.env.example` del backend.
- Frontend: `NEXT_PUBLIC_API_URL=http://localhost:3000`. Añadir `/api/v1` una sola vez en el cliente HTTP.
- Todo fetch protegido usa `credentials: "include"`. JSON de escritura usa `Content-Type: application/json`.
- Respuesta habitual: `{ success: true, data: T }`. Listados: `{ success: true, data: T[], meta: { page, pageSize, total, totalPages } }`.
- Errores: `{ success: false, error: { code, message, fields?: Record<string,string[]> }, requestId }`. Conservar código y campos en el cliente.
- Las bajas y logout devuelven `204` sin JSON. No intentar parsearlos.
- Páginas empiezan en 1, `pageSize` por defecto 20 y máximo 100. Una lista vacía tiene `totalPages: 0`.
- Salud: `GET /health`, `GET /ready`. Swagger: `/api/docs`; OpenAPI: `/api/openapi.json`.

## Identidad

- Navegar, sin fetch, a `GET /api/v1/auth/google` para iniciar OAuth.
- Google vuelve al backend, que redirige al frontend a `/auth/success` o `/auth/complete-profile`.
- `/auth/success` consulta `GET /auth/me` y redirige según el rol devuelto por servidor.
- `POST /auth/complete-profile`: **solo** `{ institutionalId, phone?: string|null }`; email/nombre/rol/Google se derivan de la cookie temporal.
- `GET /auth/me`: `{ id, email, fullName, institutionalId, phone, role, supportAreas, skills, avatarUrl }`.
- `PATCH /users/me`: `{ fullName?: string, phone?: string|null }`.
- `POST /auth/logout`: 204. No requiere enviar body.
- Sesión JWT propia en cookie HttpOnly `sist_session`, SameSite=Lax, Secure en producción, duración de un día. No hay refresh endpoint, bearer token JS, NextAuth ni almacenamiento de JWT en localStorage.
- OAuth usa state + PKCE en cookies temporales. No hay encabezado CSRF adicional definido en el contrato actual.
- En producción usar frontend y API bajo el mismo sitio para conservar cookies SameSite=Lax, por ejemplo subdominios institucionales; HTTPS y CORS `FRONTEND_URL` deben estar configurados.
- Configuración real requiere PostgreSQL/migraciones, `JWT_SECRET` ≥32 caracteres, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, callback Google exacto y dominios institucionales autorizados. No hay login de desarrollo público.

Roles: `USER`, `SUPPORT`, `SUB_MANAGER`, `ADMIN`. Áreas: `HARDWARE`, `SOFTWARE`, `NETWORKS`, `ADMINISTRATIVE`.

## Dashboard

`GET /dashboard`, sin rol/query suministrado por cliente:

- USER: `{ stats: { active, inProgress, completed }, recentTickets: TicketListItem[] }`.
- SUPPORT/SUB_MANAGER: `{ stats: { unassigned, mine, highPriority, completedToday }, priorityTickets: TicketListItem[] }`.
- ADMIN: `{ stats: { activeTickets, unassigned, activeTechnicians, inventoryItems }, technicianWorkload: [{ userId, name, supportAreas, activeTickets, completedToday }] }`.
- Los días de dashboard/reportes usan `APP_TIMEZONE`, por defecto `America/Tijuana`.

## Catálogo y categorías

- `GET /catalog/ticket-form`: `{ categories: [{ id, code, name, supportArea, defaultPriority, requiresSoftwareDetails, subcategories: [{id,code,name,priority}] }], maxActiveTickets: 10 }`.
- `GET /catalog/support-suggestions?categoryId=UUID&subcategoryId=UUID`: `[{ id, title, description }]`; subcategoría opcional. La lista puede estar vacía porque no hay contenido ficticio de respaldo.
- `GET /categories`: categorías activas con las propiedades anteriores más `isActive` en categorías/subcategorías. ADMIN puede enviar `?includeInactive=true`.
- ADMIN `POST /categories`: `{ code, name, supportArea, defaultPriority?: "LOW"|"MEDIUM"|"HIGH"|null, requiresSoftwareDetails?: boolean }`.
- ADMIN `PATCH /categories/:id`: `{ name?, supportArea?, defaultPriority?, requiresSoftwareDetails?, isActive? }`.
- ADMIN `DELETE /categories/:id`: baja lógica.
- ADMIN `POST /categories/:categoryId/subcategories`: `{ code, name, priority?: Priority|null }`.
- ADMIN `PATCH /subcategories/:id`: `{ name?, priority?, isActive? }`.
- ADMIN `DELETE /subcategories/:id`: baja lógica.
- Los códigos usan `UPPER_SNAKE_CASE`, son inmutables. La prioridad efectiva es la de subcategoría o la predeterminada de categoría; ambas null impiden crear tickets.

## Tickets

Estados: `OPEN`, `IN_REVIEW`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. Prioridades: `LOW`, `MEDIUM`, `HIGH`.

Solo USER crea: `POST /tickets` con `{ title, categoryId, subcategoryId?: UUID|null, building, room?: string|null, description, contactPhone?: string|null, inventoryItemId?: UUID|null, software?: { name, version, downloadUrl, coordinationApprovalReference } }`.

- Título 1–150 caracteres, edificio 1–120, aula hasta 80.
- Descripción 1–50 palabras; teléfono opcional, mínimo 7 dígitos y máximo 40 caracteres.
- Subcategoría obligatoria si existen subcategorías activas.
- Los cuatro campos de software son obligatorios únicamente cuando `requiresSoftwareDetails=true`; omitir `software` en otras categorías.
- No enviar `priority`, `status`, `code`, reportero ni snapshots. El servidor los determina.
- Máximo 10 tickets activos. Duplicado activo por categoría + edificio/aula normalizados, aunque cambie subcategoría o reportero.
- USER no tiene acceso a `GET /inventory` aunque el POST acepte un ID opcional de inventario; no cargar un selector protegido para USER.

`GET /tickets` filtros: `page`, `pageSize`, `search` (título/código), `status`, `priority`, `categoryId`, `subcategoryId`, `createdFrom`/`createdTo` (ISO datetime con zona), `sort=createdAt|updatedAt|priority|status|code`, `order=asc|desc`. Solo soporte/admin: `assignment=mine|unassigned|assigned`, `assignedTo=UUID`, `supportArea` (solo áreas propias para soporte).

`TicketListItem`: `{ id, code, title, category: {id,name}, subcategory: {id,name}|null, location: {building,room}, priority, status, assignee: {id,fullName}|null, createdAt }`.

`GET /tickets/:id`: añade `description`, `reporter: {id,fullName,email,phone}`, `category.code` y `category.supportArea`, `subcategory.code`, `inventoryItem: {id,type,model,assetCode}|null`, `software: {name,version,downloadUrl,coordinationApprovalReference}|null`, `updatedAt`, `assignedAt`, `completedAt`, `cancelledAt`.

`GET /tickets/:id/events`: `[{ id, type, actor: {id,fullName}|null, fromStatus, toStatus, metadata, createdAt }]`, orden antiguo → nuevo. Reportero y datos de contacto son snapshots históricos.

Visibilidad: USER propios; SUPPORT/SUB_MANAGER todos los de sus áreas; ADMIN todos.

Mutaciones, solo para tickets activos:

- SUPPORT/SUB_MANAGER `POST /tickets/:id/assign-self`, sin campos, solo tickets sin asignar de sus áreas.
- ADMIN `PUT /tickets/:id/assignee`, `{ assigneeId }`; candidatos mediante `/support-members?supportArea=AREA&active=true` (paginado). `DELETE` misma ruta desasigna (204).
- SUPPORT/SUB_MANAGER/ADMIN `PATCH /tickets/:id/status`, `{ status, note?: string }`; soporte solo los asignados a sí mismos y en sus áreas. Transiciones: OPEN → IN_REVIEW o IN_PROGRESS; IN_REVIEW → IN_PROGRESS; IN_PROGRESS → COMPLETED. Desde cualquier activo → CANCELLED con nota obligatoria 1–500 caracteres. USER no puede cancelar tickets.
- Cambio de estado admite `Idempotency-Key`; generar una clave por intento lógico y conservar body+clave en reintentos de red. Validez 24 h; reutilizar con distinto body responde `IDEMPOTENCY_CONFLICT`.
- ADMIN `PATCH /tickets/:id/priority`, `{ priority, reason }`, motivo obligatorio 1–500.
- COMPLETED/CANCELLED terminales: no reapertura, asignación, prioridad ni estado.
- No existe edición, borrado o adjuntos de tickets ni comentarios libres fuera de las notas de transición.

Errores útiles: `DUPLICATE_TICKET`, `ACTIVE_TICKET_LIMIT_REACHED`, `TICKET_PRIORITY_NOT_CONFIGURED`, `INVALID_STATUS_TRANSITION`, `TICKET_ALREADY_ASSIGNED`, `TICKET_NOT_ASSIGNED_TO_YOU`, `ASSIGNEE_INACTIVE`, `ASSIGNEE_AREA_MISMATCH`, `VALIDATION_ERROR`.

## Bitácora

SUPPORT consulta; SUB_MANAGER consulta/crea/edita/historial dentro de sus áreas; ADMIN todas. USER sin acceso.

- `GET /activity-log`: paginado, filtros `ticketId`, `technicianId` (participante), `status=IN_PROGRESS|COMPLETED`, `search`, `from`, `to`. Fechas ISO o YYYY-MM-DD, día UTC final inclusivo.
- Lista: `{ id, ticket:{id,code,title}, failure, activity, participants:[{id,fullName}], serviceStartedAt, serviceEndedAt, timeSpentMinutes, status, createdAt }`.
- `GET /activity-log/:id`: añade `reporter:{fullName,email,phone}`, `createdBy:{id,fullName}`, `updatedAt`.
- `GET /catalog/activity-log-participants?ticketId=UUID`: solo SUB_MANAGER/ADMIN, lista simple `[{id,fullName,role}]`. No usar `/support-members` con SUB_MANAGER.
- `POST /activity-log`: `{ ticketId, activity, participantIds:[UUID], serviceStartedAt:ISO, serviceEndedAt:ISO|null, timeSpentMinutes:enteroPositivo, status:"IN_PROGRESS"|"COMPLETED" }`.
- Ticket asociado debe estar IN_PROGRESS/COMPLETED; ≥1 participante activo único. COMPLETED exige fecha final ≥ inicio. Minutos son tiempo efectivo, no intervalo calculado.
- `PATCH /activity-log/:id`: mismos campos opcionales excepto ticketId; cada cambio genera revisión inmutable.
- `GET /activity-log/:id/history`: `[{ id, changedBy:{id,fullName}, previousData, newData, createdAt }]`.
- No existe DELETE; snapshots no deben recalcularse desde el ticket actual.

## Inventario

Solo SUB_MANAGER/ADMIN. Tipos `COMPUTER`, `PROJECTOR`, `CONTROL`, `ADAPTER`.

- `GET /inventory`: paginado, `search`, `type`, `building`, `active=true|false` (default true; no filtro «todos»).
- Lista `{ id,type,model,assetCode,color,size,location:{building,room},serialNumber,quantity,isActive,updatedAt }`.
- `POST /inventory`: `{ type, model, assetCode?, color?, size?, building?, room?, serialNumber?, quantity?, notes? }`; strings opcionales vacíos → null.
- COMPUTER requiere modelo, patrimonio, color, tamaño, edificio y serie; cantidad 1.
- PROJECTOR requiere modelo, patrimonio, color y tamaño; cantidad 1.
- CONTROL/ADAPTER requieren modelo y cantidad entera ≥1; demás opcionales.
- `GET /inventory/:id`: detalle con `building`/`room` **planos**, `notes`, `createdAt`, `updatedAt` (no `location`). Funciona para inactivos.
- `PATCH /inventory/:id`: todos los campos de texto/cantidad excepto type; omitir id/isActive/timestamps. No reactivación.
- `DELETE /inventory/:id`: baja lógica idempotente (204).
- `GET /inventory/:id/tickets`: paginado, `status`, `from`, `to`; funciona tras baja; reportero histórico.
- Patrimonio/serie permanecen únicos aun tras baja. Errores: `INVENTORY_ASSET_CODE_ALREADY_EXISTS`, `INVENTORY_SERIAL_NUMBER_ALREADY_EXISTS`, `INVENTORY_ITEM_INACTIVE`.

## Miembros de soporte

Solo ADMIN. No hay gestión CRUD genérica de usuarios ordinarios.

- `GET /support-members`: paginado, `search`, `role=SUPPORT|SUB_MANAGER`, `supportArea`, `active=true|false` (default true).
- Lista `{ id,fullName,email,institutionalId,role,supportAreas,skills,isActive,googleLinked,lastLoginAt }`.
- `POST /support-members`: `{ fullName,email,institutionalId,role:"SUPPORT"|"SUB_MANAGER",supportAreas:[AREA],skills:[string] }`. Áreas no vacías; habilidades pueden ser [].
- `GET /support-members/:id`: añade createdAt/updatedAt, también inactivos.
- `PATCH /support-members/:id`: `{fullName?,role?,supportAreas?,skills?,isActive?}`. Email e institutionalId inmutables. Reactivar con isActive=true.
- `DELETE /support-members/:id`: baja lógica (204); con activos asignados `SUPPORT_MEMBER_HAS_ACTIVE_TICKETS`, exige reasignar/desasignar.
- Preaprovisiona sin invitación ni contraseña: la primera autenticación Google con mismo correo vincula cuenta y conserva rol/áreas.

## Reportes

Solo ADMIN, `GET /reports/activity?from=YYYY-MM-DD&to=YYYY-MM-DD`; ambas fechas obligatorias inclusivas. Filtros opcionales `supportArea`, `categoryId`, `technicianId` (asignado actual/final, no creador).

`{ summary:{ticketsCreated,ticketsCompleted,pending,averageResolutionMinutes}, byCategory:[{categoryId,category,count}], byTechnician:[{technicianId,name,completed,active}], daily:[{date,created,completed}] }`.

La respuesta no repite filtros/periodo. `daily` incluye días sin actividad. `ticketsCreated` usa createdAt y `ticketsCompleted` usa completedAt (cohortes distintas); `pending` es el estado actual de tickets creados en el rango. Sin endpoints PDF/Excel: una exportación frontend deberá generar su archivo desde estos datos y conservar fechas/filtros.

## Límites de integración

No hay endpoint de notificaciones de aplicación, lectura de mensajes, adjuntos, contraseñas, búsqueda de inventario pública/USER, usuarios ordinarios administrativos ni exportaciones. Las notificaciones de asignación/recordatorio salen por outbox/SMTP del backend: no repetir mutaciones ni llamar otra ruta para enviarlas. OAuth y SMTP reales siguen dependiendo de credenciales del entorno. El frontend no puede validar afiliación FCQI vigente más allá de la allowlist institucional implementada.
