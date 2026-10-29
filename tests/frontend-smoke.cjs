/* Local browser QA against a contract-shaped mock API. Never imported by the application. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
let playwright;
try { playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
catch { playwright = require('../../.tools/browser-qa/node_modules/playwright'); }
const baseURL = process.env.FRONTEND_TEST_URL || 'http://localhost:3001';
const artifacts = path.join(__dirname, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const userId = '10000000-0000-4000-8000-000000000001';
const supportId = '10000000-0000-4000-8000-000000000002';
const catId = '20000000-0000-4000-8000-000000000001';
const softwareId = '20000000-0000-4000-8000-000000000002';
const subId = '30000000-0000-4000-8000-000000000001';
const ticketId = '40000000-0000-4000-8000-000000000001';
const itemId = '50000000-0000-4000-8000-000000000001';
const activityId = '60000000-0000-4000-8000-000000000001';
const categories = [
  { id: catId, code: 'EQUIPMENT', name: 'Falla de equipo', supportArea: 'HARDWARE', defaultPriority: 'MEDIUM', requiresSoftwareDetails: false, isActive: true, subcategories: [{ id: subId, code: 'INOPERABLE', name: 'Sistema inoperable', priority: 'HIGH', isActive: true }] },
  { id: softwareId, code: 'SOFTWARE_INSTALL', name: 'Instalación de software', supportArea: 'SOFTWARE', defaultPriority: 'HIGH', requiresSoftwareDetails: true, isActive: true, subcategories: [] },
];
const names = { USER: 'Andrea Universidad', SUPPORT: 'Tomás Soporte', SUB_MANAGER: 'María Responsable', ADMIN: 'Alicia Administración' };
const makeUser = role => ({ id: role === 'USER' ? userId : role === 'SUPPORT' ? supportId : `10000000-0000-4000-8000-00000000000${role === 'ADMIN' ? 4 : 3}`, fullName: names[role], email: `${role.toLowerCase()}@uabc.edu.mx`, institutionalId: '1234567', phone: null, role, supportAreas: role === 'USER' ? [] : ['HARDWARE', 'SOFTWARE'], skills: [], avatarUrl: null });
const members = Array.from({ length: 24 }, (_, i) => ({ id: i === 0 ? supportId : `70000000-0000-4000-8000-${String(i).padStart(12, '0')}`, fullName: i === 0 ? names.SUPPORT : `Técnico ${String(i).padStart(2, '0')}`, email: `tecnico${i}@uabc.edu.mx`, institutionalId: `EMP-${i}`, role: 'SUPPORT', supportAreas: ['HARDWARE'], skills: ['Diagnóstico'], isActive: true, googleLinked: true, lastLoginAt: '2026-10-28T16:00:00.000Z', createdAt: '2026-10-01T16:00:00.000Z', updatedAt: '2026-10-28T16:00:00.000Z' }));
const tickets = Array.from({ length: 23 }, (_, i) => ({ id: i === 0 ? ticketId : `40000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, code: `SIST-${String(1001 + i)}`, title: i === 0 ? 'Equipo del laboratorio sin señal' : `Incidencia de prueba ${i + 1}`, description: 'El equipo del laboratorio no muestra señal al encender.', category: { id: catId, code: 'EQUIPMENT', name: 'Falla de equipo', supportArea: 'HARDWARE' }, subcategory: { id: subId, name: 'Sistema inoperable' }, priority: i % 2 ? 'MEDIUM' : 'HIGH', status: i === 0 ? 'IN_PROGRESS' : 'OPEN', location: { building: 'Edificio 6A', room: 'Laboratorio 204' }, assignee: i === 0 ? { id: supportId, fullName: names.SUPPORT } : null, reporter: { id: userId, fullName: names.USER, email: 'user@uabc.edu.mx', phone: null }, createdAt: '2026-10-28T16:00:00.000Z', updatedAt: '2026-10-28T17:00:00.000Z', completedAt: null, cancelledAt: null, inventoryItem: { id: itemId, model: 'Dell OptiPlex 7090', assetCode: 'PAT-001', type: 'COMPUTER' }, software: null }));
const inventory = [{ id: itemId, type: 'COMPUTER', model: 'Dell OptiPlex 7090', assetCode: 'PAT-001', serialNumber: 'QA-123', color: 'Negro', size: 'SFF', quantity: 1, location: { building: 'Edificio 6A', room: 'Laboratorio 204' }, building: 'Edificio 6A', room: 'Laboratorio 204', notes: null, isActive: true, createdAt: '2026-10-01T16:00:00.000Z', updatedAt: '2026-10-28T16:00:00.000Z' }];
const activity = [{ id: activityId, ticket: { id: ticketId, code: tickets[0].code, title: tickets[0].title }, failure: tickets[0].description, activity: 'Diagnóstico de cableado y monitor del laboratorio.', reporter: tickets[0].reporter, participants: [{ id: supportId, fullName: names.SUPPORT, role: 'SUPPORT' }], serviceStartedAt: '2026-10-28T16:00:00.000Z', serviceEndedAt: null, timeSpentMinutes: 90, status: 'IN_PROGRESS', createdAt: '2026-10-28T16:00:00.000Z', updatedAt: '2026-10-28T16:00:00.000Z', createdBy: { id: makeUser('ADMIN').id, fullName: names.ADMIN } }];
const requests = [], mutations = [], failures = [], checks = [], pageErrors = [];
let statusFailOnce = false;
const savedStatusAttempts = [];
const allEvents = [{ id: 'event-1', type: 'CREATED', fromStatus: null, toStatus: 'OPEN', createdAt: '2026-10-28T16:00:00.000Z', actor: { id: userId, fullName: names.USER }, metadata: {} }];
function envelope(data, meta) { return { success: true, data, ...(meta ? { meta } : {}) }; }
function paginate(data, query) { const page = +(query.get('page') || 1), pageSize = +(query.get('pageSize') || 20); return envelope(data.slice((page - 1) * pageSize, page * pageSize), { page, pageSize, total: data.length, totalPages: Math.ceil(data.length / pageSize) }); }
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3000');
  const pathname = url.pathname.replace('/api/v1', '');
  const role = /sist_test_role=(USER|SUPPORT|SUB_MANAGER|ADMIN)/.exec(req.headers.cookie || '')?.[1];
  const record = { method: req.method, path: pathname, search: url.search, role, cookie: req.headers.cookie || '', origin: req.headers.origin || '' };
  requests.push(record);
  res.setHeader('Access-Control-Allow-Origin', baseURL);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Idempotency-Key');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  let body = ''; for await (const chunk of req) body += chunk;
  const input = body ? JSON.parse(body) : {};
  const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  const error = (status, code, message, fields = {}) => send({ success: false, error: { code, message, fields } }, status);
  if (!role && pathname !== '/auth/logout') return error(401, 'AUTHENTICATION_REQUIRED', 'Inicia sesión para continuar.');
  if (req.method !== 'GET') mutations.push({ ...record, body: input, key: req.headers['idempotency-key'] });
  if (pathname === '/auth/me') return send(envelope(makeUser(role)));
  if (pathname === '/auth/logout') { res.writeHead(204); return res.end(); }
  if (pathname === '/dashboard') return send(envelope(role === 'USER' ? { stats: { active: 23, inProgress: 1, completed: 0 }, recentTickets: tickets.slice(0, 5) } : role === 'ADMIN' ? { stats: { activeTickets: 23, unassigned: 22, activeTechnicians: 24, inventoryItems: 1 }, technicianWorkload: [{ userId: supportId, name: names.SUPPORT, supportAreas: ['HARDWARE'], activeTickets: 1, completedToday: 0 }] } : { stats: { unassigned: 22, mine: 1, highPriority: 12, completedToday: 0 }, priorityTickets: tickets.slice(0, 10) }));
  if (pathname === '/catalog/ticket-form') return send(envelope({ categories, maxActiveTickets: 10 }));
  if (pathname === '/catalog/support-suggestions') return send(envelope([]));
  if (pathname === '/catalog/activity-log-participants') return send(envelope([{ id: supportId, fullName: names.SUPPORT, role: 'SUPPORT' }]));
  if (pathname === '/categories') { if (req.method === 'POST') { const created = { id: '20000000-0000-4000-8000-000000000003', ...input, subcategories: [], isActive: true }; categories.push(created); return send(envelope(created), 201); } return send(envelope(categories)); }
  if (pathname.startsWith('/categories/') || pathname.startsWith('/subcategories/')) return send(envelope({ ...categories[0], ...input }));
  if (pathname === '/support-members') { let data = members.filter(member => member.isActive === (url.searchParams.get('active') !== 'false')); const search = url.searchParams.get('search')?.toLowerCase(); if (search) data = data.filter(member => `${member.fullName} ${member.email}`.toLowerCase().includes(search)); if (req.method === 'POST') return send(envelope({ ...members[0], ...input, id: '70000000-0000-4000-8000-000000000099' }), 201); return send(paginate(data, url.searchParams)); }
  if (pathname.startsWith('/support-members/')) { const member = members.find(row => pathname.endsWith(row.id)) || members[0]; if (req.method === 'DELETE') { res.writeHead(204); return res.end(); } return send(envelope({ ...member, ...input })); }
  if (pathname === '/reports/activity') { const from = url.searchParams.get('from'), to = url.searchParams.get('to'); const daily = []; const date = new Date(`${from}T00:00:00.000Z`); while (date.toISOString().slice(0, 10) <= to && daily.length < 400) { daily.push({ date: date.toISOString().slice(0, 10), created: daily.length % 4, completed: daily.length % 3 }); date.setUTCDate(date.getUTCDate() + 1); } return send(envelope({ summary: { ticketsCreated: 23, ticketsCompleted: 7, pending: 16, averageResolutionMinutes: 135 }, byCategory: [{ categoryId: catId, category: 'Falla de equipo', count: 23 }], byTechnician: [{ technicianId: supportId, name: names.SUPPORT, completed: 7, active: 1 }], daily })); }
  if (pathname === '/inventory') { if (req.method === 'POST') return send(envelope({ ...inventory[0], ...input, id: '50000000-0000-4000-8000-000000000002' }), 201); return send(paginate(inventory, url.searchParams)); }
  if (/^\/inventory\/[^/]+\/tickets$/.test(pathname)) return send(paginate([tickets[0]], url.searchParams));
  if (pathname.startsWith('/inventory/')) return send(envelope({ ...inventory[0], ...input }));
  if (pathname === '/activity-log') { if (req.method === 'POST') return send(envelope({ ...activity[0], ...input }), 201); return send(paginate(activity, url.searchParams)); }
  if (pathname.endsWith('/history')) return send(envelope([]));
  if (pathname.startsWith('/activity-log/')) return send(envelope({ ...activity[0], ...input }));
  if (pathname === '/users/me') return send(envelope({ ...makeUser(role), ...input }));
  if (pathname === '/tickets') {
    if (req.method === 'POST') { const ticket = { ...tickets[0], id: '40000000-0000-4000-8000-000000000099', code: 'SIST-1099', title: input.title, description: input.description, status: 'OPEN', priority: 'HIGH', location: { building: input.building, room: input.room }, software: input.software || null }; return send(envelope(ticket), 201); }
    let data = tickets;
    const q = url.searchParams; if (q.get('search')) data = data.filter(ticket => `${ticket.code} ${ticket.title}`.toLowerCase().includes(q.get('search').toLowerCase()));
    for (const key of ['status', 'priority']) if (q.get(key)) data = data.filter(ticket => ticket[key] === q.get(key));
    if (q.get('categoryId')) data = data.filter(ticket => ticket.category.id === q.get('categoryId'));
    if (q.get('assignment') === 'mine') data = data.filter(ticket => ticket.assignee?.id === makeUser(role).id);
    return send(paginate(data, q));
  }
  const match = /^\/tickets\/([^/]+)(?:\/(.*))?$/.exec(pathname);
  if (match) {
    const ticket = tickets.find(ticket => ticket.id === match[1]) || tickets[0];
    if (match[2] === 'events') return send(envelope(allEvents));
    if (match[2] === 'status') { savedStatusAttempts.push({ body: input, key: req.headers['idempotency-key'] }); if (statusFailOnce) { statusFailOnce = false; return error(503, 'TEMPORARY_FAILURE', 'Interrupción temporal. Puedes volver a intentar.'); } ticket.status = input.status; if (input.status === 'COMPLETED') ticket.completedAt = new Date().toISOString(); return send(envelope(ticket)); }
    return send(envelope(ticket));
  }
  return error(404, 'NOT_FOUND', `Mock sin ruta ${pathname}`);
});

async function main() {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(+(process.env.FRONTEND_MOCK_PORT || 3000), 'localhost', resolve); });
  const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  async function step(name, run) { try { await run(); checks.push(name); console.log(`PASS ${name}`); } catch (cause) { failures.push({ name, error: cause.message }); console.log(`FAIL ${name}: ${cause.message}`); } }
  async function context(role, mobile = false) { const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1024 }, deviceScaleFactor: 1, locale: 'es-MX', timezoneId: 'America/Los_Angeles' }); ctx.setDefaultTimeout(10000); ctx.on('page', page => page.on('pageerror', error => pageErrors.push(error.message))); if (role) await ctx.addCookies([{ name: 'sist_test_role', value: role, url: baseURL }]); return ctx; }
  async function shot(page, name) { await page.screenshot({ path: path.join(artifacts, `${name}.png`), fullPage: true }); }
  async function visit(page, route, heading) { await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' }); if (heading) await page.getByRole('heading', { name: heading, exact: true }).waitFor(); }
  async function noOverflow(page) { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Horizontal page overflow'); }
  const publicContext = await context(); const login = await publicContext.newPage();
  await step('Login institucional real y sin acceso simulado', async () => { await visit(login, '/', 'Tu facultad, siempre en funcionamiento.'); assert.match(await login.getByRole('link', { name: 'Continuar con Google' }).getAttribute('href'), /\/api\/v1\/auth\/google$/); await shot(login, 'login-desktop'); });
  await publicContext.close();
  const userContext = await context('USER'); const user = await userContext.newPage();
  await step('Dashboard USER con datos API y permisos de navegación', async () => { await visit(user, '/usuario', 'Hola, Andrea'); assert.equal(await user.getByRole('link', { name: 'Equipo de soporte', exact: true }).count(), 0); await shot(user, 'usuario-desktop'); });
  await step('Retorno de acceso consulta sesión una sola vez y redirige por rol', async () => { const before = requests.filter(request => request.path === '/auth/me' && request.role === 'USER').length; await user.goto(`${baseURL}/auth/success`, { waitUntil: 'networkidle' }); await user.waitForURL(url => url.pathname === '/usuario'); await user.getByRole('heading', { name: 'Hola, Andrea', exact: true }).waitFor(); assert.equal(requests.filter(request => request.path === '/auth/me' && request.role === 'USER').length - before, 1); });
  await step('Bloqueo de ruta administrativa a USER con aviso de permisos', async () => { await user.goto(`${baseURL}/admin/equipo`); await user.waitForURL(url => url.pathname === '/usuario'); await user.getByText('Tu cuenta no tiene permisos para acceder a esa sección. Te llevamos a tu espacio de trabajo.').waitFor(); });
  await step('Filtros y paginación de tickets', async () => { await visit(user, '/usuario/tickets'); await user.getByRole('button', { name: 'Página siguiente', exact: true }).click(); await user.waitForTimeout(200); assert.ok(requests.some(request => request.path === '/tickets' && /page=2/.test(request.search))); const search = user.locator('input[type=search]').first(); await search.fill('Sin resultado QA'); await user.waitForTimeout(450); await user.getByText(/No hay tickets|No encontramos|No hay resultados/).first().waitFor(); });
  await step('Formulario ticket valida obligatorios conservando contenido', async () => { await visit(user, '/usuario/nuevo', 'Reportar una incidencia'); await user.locator('#title').fill('Prueba de validación'); await user.getByRole('button', { name: 'Crear ticket', exact: true }).click(); await user.getByText('Selecciona una categoría disponible.').waitFor(); assert.equal(await user.locator('#title').inputValue(), 'Prueba de validación'); });
  await step('Descripción rechaza más de 50 palabras', async () => { await user.locator('#categoryId').selectOption(catId); await user.locator('#subcategoryId').selectOption(subId); await user.locator('#building').fill('Edificio 6A'); await user.locator('#description').fill(Array(51).fill('palabra').join(' ')); await user.getByRole('button', { name: 'Crear ticket', exact: true }).click(); await user.getByText('La descripción admite un máximo de 50 palabras.').waitFor(); });
  await step('Software requiere cuatro campos y autorización de coordinación', async () => { await user.locator('#categoryId').selectOption(softwareId); await user.locator('#description').fill('Solicito instalar software académico.'); await user.getByRole('button', { name: 'Crear ticket', exact: true }).click(); await user.locator('#coordinationApprovalReference-error').waitFor(); await shot(user, 'ticket-software-desktop'); });
  await step('Borrador ticket sobrevive desconexión y recarga', async () => { await userContext.setOffline(true); await user.locator('#title').fill('Borrador sin conexión'); await user.waitForTimeout(100); assert.equal(await user.getByRole('button', { name: 'Crear ticket', exact: true }).isDisabled(), true); await userContext.setOffline(false); await user.reload({ waitUntil: 'networkidle' }); assert.equal(await user.locator('#title').inputValue(), 'Borrador sin conexión'); await user.getByText('Recuperamos tu borrador de este dispositivo. Puedes continuar donde lo dejaste.').waitFor(); });
  await step('Creación ticket usa payload permitido y confirma folio', async () => { await user.locator('#categoryId').selectOption(catId); await user.locator('#subcategoryId').selectOption(subId); await user.locator('#description').fill('No enciende el equipo académico.'); await user.getByRole('button', { name: 'Crear ticket', exact: true }).click(); await user.getByRole('heading', { name: 'Ticket creado correctamente' }).waitFor(); const sent = mutations.findLast(request => request.path === '/tickets' && request.method === 'POST'); assert.ok(sent); assert.equal('priority' in sent.body, false); assert.equal('reporterId' in sent.body, false); assert.equal(sent.body.room, null); });
  await step('Detalle USER oculta acciones de atención', async () => { await visit(user, `/usuario/tickets/${ticketId}`, 'Equipo del laboratorio sin señal'); assert.equal(await user.getByRole('button', { name: 'Actualizar estado' }).count(), 0); await shot(user, 'ticket-detalle-desktop'); });
  await userContext.close();
  const supportContext = await context('SUPPORT'); const support = await supportContext.newPage();
  await step('Dashboard SUPPORT y bitácora de solo lectura', async () => { await visit(support, '/soporte', 'Panel de soporte'); await visit(support, '/soporte/bitacora', 'Bitácora de actividades'); assert.equal(await support.getByRole('button', { name: 'Registrar actividad', exact: true }).count(), 0); await shot(support, 'soporte-bitacora-desktop'); });
  await step('Filtro directo por técnico se limpia al cambiar asignación', async () => { await visit(support, `/soporte/tickets?assignedTo=${supportId}`); await support.getByText('Mostrando tickets del miembro seleccionado.', { exact: false }).waitFor(); await support.getByRole('button', { name: 'Sin asignar', exact: true }).click(); await support.waitForTimeout(200); const request = requests.findLast(request => request.path === '/tickets' && request.role === 'SUPPORT'); assert.match(request.search, /assignment=unassigned/); assert.equal(new URLSearchParams(request.search).has('assignedTo'), false); assert.equal(await support.getByRole('button', { name: 'Sin asignar', exact: true }).getAttribute('aria-pressed'), 'true'); });
  await step('Confirmación de finalización e idempotencia en reintento', async () => { await visit(support, `/soporte/tickets/${ticketId}`); await support.getByRole('button', { name: 'Actualizar estado', exact: true }).click(); await support.locator('#new-status').selectOption('COMPLETED'); await support.getByText(/Este es un estado final/).waitFor(); statusFailOnce = true; await support.getByRole('button', { name: 'Confirmar resolución', exact: true }).click(); await support.getByText('Interrupción temporal. Puedes volver a intentar.').waitFor(); await support.getByRole('button', { name: 'Confirmar resolución', exact: true }).click(); await support.getByText('Estado actualizado: Completado.').waitFor(); assert.equal(savedStatusAttempts.length, 2); assert.ok(savedStatusAttempts[0].key); assert.equal(savedStatusAttempts[0].key, savedStatusAttempts[1].key); assert.deepEqual(savedStatusAttempts[0].body, savedStatusAttempts[1].body); });
  await supportContext.close();
  const subContext = await context('SUB_MANAGER'); const sub = await subContext.newPage();
  await step('SUB_MANAGER ve inventario y registro bitácora', async () => { await visit(sub, '/soporte/inventario', 'Inventario'); await sub.getByRole('button', { name: 'Registrar artículo', exact: true }).click(); await sub.locator('#item-type').selectOption('CONTROL'); await sub.getByRole('button', { name: 'Registrar artículo', exact: true }).last().click(); await sub.getByText(/modelo.*obligatorio|Ingresa.*modelo/i).first().waitFor({ timeout: 3000 }); await sub.keyboard.press('Escape'); await visit(sub, '/soporte/bitacora', 'Bitácora de actividades'); await sub.getByRole('button', { name: 'Registrar actividad', exact: true }).click(); await sub.locator('#log-activity').fill('Borrador de actividad sin conexión'); await shot(sub, 'bitacora-formulario-desktop'); });
  await step('Borrador de bitácora conserva actividad offline tras recarga', async () => { await subContext.setOffline(true); await sub.locator('#log-activity').fill('Diagnóstico conservado sin red'); await sub.waitForFunction(() => { const draft = Object.entries(localStorage).find(([key]) => key.startsWith('sist:activity-draft:'))?.[1]; return draft && JSON.parse(draft).activity === 'Diagnóstico conservado sin red'; }); await subContext.setOffline(false); await sub.reload({ waitUntil: 'networkidle' }); await sub.getByRole('button', { name: 'Registrar actividad', exact: true }).click(); assert.equal(await sub.locator('#log-activity').inputValue(), 'Diagnóstico conservado sin red'); await sub.keyboard.press('Escape'); });
  await subContext.close();
  const adminContext = await context('ADMIN'); const admin = await adminContext.newPage();
  await step('Dashboard ADMIN datos y carga del equipo', async () => { await visit(admin, '/admin', 'Vista general'); await shot(admin, 'admin-desktop'); });
  await step('Categorías y subcategorías renderizan y validan formulario', async () => { await visit(admin, '/admin/categorias', 'Categorías de atención'); await admin.getByRole('button', { name: 'Nueva categoría', exact: true }).click(); await admin.getByRole('button', { name: 'Crear categoría', exact: true }).click(); assert.equal(await admin.locator('#catalog-name').getAttribute('aria-invalid'), 'true'); await admin.locator('#catalog-name').fill('Categoría de prueba'); await admin.locator('#catalog-code').fill('QA_CATEGORY'); await admin.locator('#catalog-defaultPriority').selectOption('MEDIUM'); await shot(admin, 'categoria-editor-desktop'); await admin.getByRole('button', { name: 'Crear categoría', exact: true }).click(); await admin.getByText('La categoría se agregó al catálogo.').waitFor(); const mutation = mutations.findLast(request => request.path === '/categories' && request.method === 'POST'); assert.equal(mutation.body.code, 'QA_CATEGORY'); assert.equal(mutation.body.defaultPriority, 'MEDIUM'); });
  await step('Equipo soporte renderiza perfil y paginación', async () => { await visit(admin, '/admin/equipo', 'Equipo de soporte'); const opener = admin.getByRole('button', { name: 'Ver perfil de Tomás Soporte', exact: true }); await opener.click(); await admin.getByRole('dialog').waitFor(); await shot(admin, 'miembro-perfil-desktop'); await admin.keyboard.press('Escape'); assert.equal(await opener.evaluate(element => document.activeElement === element), true, 'Modal restores keyboard focus to its opener'); await admin.getByRole('button', { name: 'Página siguiente', exact: true }).click(); await admin.waitForTimeout(150); assert.ok(requests.some(request => request.path === '/support-members' && /page=2/.test(request.search))); });
  await step('Formulario equipo exige identidad y áreas de soporte', async () => { await admin.getByRole('button', { name: 'Agregar miembro', exact: true }).click(); await admin.getByRole('dialog').getByRole('button', { name: 'Agregar miembro', exact: true }).click(); assert.equal(await admin.locator('#edit-member-fullName').getAttribute('aria-invalid'), 'true'); await admin.locator('#edit-member-supportAreas-error').waitFor(); await admin.keyboard.press('Escape'); });
  await step('Inventario detalle e historial con datos API', async () => { await visit(admin, '/admin/inventario', 'Inventario'); await admin.getByRole('button', { name: 'Consultar Dell OptiPlex 7090', exact: true }).click(); await admin.getByRole('heading', { name: 'Historial de incidencias', exact: true }).waitFor(); await shot(admin, 'inventario-historial-desktop'); await admin.keyboard.press('Escape'); });
  await step('Reportes presenta SVG accesible y filtros por fecha', async () => { await visit(admin, '/admin/reportes', 'Reportes de actividad'); await admin.getByRole('img', { name: /Actividad diaria de tickets/ }).waitFor(); await admin.locator('#report-from').fill('2026-10-01'); await admin.locator('#report-to').fill('2026-10-07'); await admin.getByRole('button', { name: 'Aplicar filtros', exact: true }).click(); await admin.getByText('1 de octubre de 2026 — 7 de octubre de 2026').waitFor(); await shot(admin, 'reportes-desktop'); });
  await step('Paginación de selector técnico no envía formulario de reportes', async () => { await admin.getByText('Filtrar por técnico', { exact: true }).click(); const reportCallsBefore = requests.filter(request => request.path === '/reports/activity').length; await admin.getByRole('button', { name: 'Página siguiente', exact: true }).click(); await admin.waitForTimeout(250); assert.equal(requests.filter(request => request.path === '/reports/activity').length, reportCallsBefore); await admin.locator('#report-from').fill('2026-10-08'); await admin.locator('#report-to').fill('2026-10-01'); await admin.getByRole('button', { name: 'Aplicar filtros', exact: true }).click(); await admin.getByText('La fecha final debe ser igual o posterior a la inicial.').waitFor(); });
  await step('Requests CORS protegidos transportan cookies de sesión', async () => { const protectedCalls = requests.filter(request => request.method !== 'OPTIONS' && request.path !== '/auth/me' && request.path !== '/auth/logout'); assert.ok(protectedCalls.length > 20); assert.ok(protectedCalls.every(request => request.cookie.includes('sist_test_role='))); assert.ok(protectedCalls.every(request => request.origin === baseURL)); });
  await adminContext.close();
  const mobileContext = await context('USER', true); const mobile = await mobileContext.newPage();
  await step('Dashboard móvil 390px sin overflow y navegación disponible', async () => { await visit(mobile, '/usuario', 'Hola, Andrea'); await noOverflow(mobile); await mobile.getByRole('navigation', { name: 'Navegación móvil', exact: true }).waitFor(); await shot(mobile, 'usuario-mobile'); });
  await step('Menú móvil atrapa foco, cierra con Escape y lo restaura', async () => { const opener = mobile.getByRole('button', { name: 'Abrir menú', exact: true }); await opener.click(); await mobile.getByRole('dialog', { name: 'Menú principal', exact: true }).waitFor(); assert.equal(await mobile.locator('.workspace').getAttribute('inert'), ''); assert.ok(await mobile.evaluate(() => document.querySelector('#app-sidebar').contains(document.activeElement))); await mobile.keyboard.press('Shift+Tab'); assert.ok(await mobile.evaluate(() => document.querySelector('#app-sidebar').contains(document.activeElement))); await mobile.keyboard.press('Escape'); await mobile.getByRole('dialog', { name: 'Menú principal', exact: true }).waitFor({ state: 'hidden' }); assert.equal(await opener.evaluate(element => document.activeElement === element), true); });
  await step('Formulario móvil 390px sin overflow', async () => { await visit(mobile, '/usuario/nuevo'); await noOverflow(mobile); await shot(mobile, 'ticket-nuevo-mobile'); });
  await mobileContext.close();
  const mobileLoginContext = await context(null, true); const mobileLogin = await mobileLoginContext.newPage();
  await step('Login móvil 390px sin overflow', async () => { await visit(mobileLogin, '/'); await noOverflow(mobileLogin); await shot(mobileLogin, 'login-mobile'); });
  await mobileLoginContext.close();
  const mobileAdminContext = await context('ADMIN', true); const mobileAdmin = await mobileAdminContext.newPage();
  await step('Reportes móvil 390px sin overflow', async () => { await visit(mobileAdmin, '/admin/reportes', 'Reportes de actividad'); await mobileAdmin.getByRole('img', { name: /Actividad diaria de tickets/ }).waitFor(); await noOverflow(mobileAdmin); await shot(mobileAdmin, 'reportes-mobile'); });
  await mobileAdminContext.close();
  await step('Sin excepciones JavaScript en las pantallas verificadas', async () => { assert.deepEqual(pageErrors, []); });
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  const result = { passed: checks.length, failed: failures.length, checks, failures, requestCount: requests.length, mutationCount: mutations.length, artifacts };
  fs.writeFileSync(path.join(artifacts, 'smoke-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = failures.length ? 1 : 0;
}
main().catch(cause => { console.error(cause); server.close(); process.exitCode = 1; });
