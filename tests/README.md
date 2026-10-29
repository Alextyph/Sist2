# Prueba de interfaz en navegador

`frontend-smoke.cjs` levanta temporalmente una API HTTP de prueba en `localhost:3000` y utiliza un navegador Edge/Chromium real contra el frontend. Los datos de prueba viven únicamente en este proceso; no se importan en la aplicación ni modifican el backend o una base de datos.

## Ejecución

1. Instalar las dependencias del frontend y compilarlo: `npm ci` y `npm run build`.
2. Iniciar el frontend en otro terminal: `npm start`. La compilación debe usar `NEXT_PUBLIC_API_URL=http://localhost:3000`.
3. Mantener libre el puerto 3000 para la API de prueba. El script termina con error si otro proceso ya lo usa; no detiene procesos existentes.
4. Playwright está incluido en las dependencias de desarrollo. Define `BROWSER_EXECUTABLE` si tu navegador Chromium está en una ruta distinta a la de Edge usada en este equipo.
5. Ejecutar `npm run test:ui` desde `Proyecto-SIST`.

La resolución intenta `PLAYWRIGHT_MODULE`, luego el paquete `playwright` del proyecto y, como respaldo local, `../../.tools/browser-qa/node_modules/playwright` relativo al script. `BROWSER_EXECUTABLE` permite elegir un navegador Chromium instalado; en este equipo se usa Edge en `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. No se descargan navegadores automáticamente.

`FRONTEND_TEST_URL` permite cambiar la URL del frontend (por defecto `http://localhost:3001`). `FRONTEND_MOCK_PORT` cambia el puerto de la API de prueba, pero debe coincidir con la URL de API utilizada al compilar el frontend.

## Evidencia y alcance

El resultado se guarda en `tests/artifacts/smoke-results.json`; las capturas de escritorio (1440 × 1024) y móvil (390 × 844) se guardan junto al resultado. Las capturas utilizan fixtures controlados, no cuentas reales.

La prueba cubre navegación y permisos de los cuatro roles, peticiones CORS con cookies, filtros y paginación, campos obligatorios, límite de 50 palabras, instalación de software, borradores offline, confirmación de resolución y conservación de la clave de idempotencia al reintentar, vistas administrativas, inventario, bitácora y ausencia de desbordamiento horizontal en pantallas representativas.

No verifica OAuth de Google real, permisos del servidor real, PostgreSQL, envío SMTP ni latencias/carga de producción. Estas integraciones necesitan credenciales e infraestructura configuradas y una prueba de extremo a extremo independiente.
