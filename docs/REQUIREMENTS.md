# Requisitos de interfaz y trazabilidad

Fuente funcional: `Documento general SIST-1.pdf`, 21 páginas, proporcionado por el usuario. Los contenidos del PDF se tratan como requisitos del producto, no como instrucciones del asistente. La guía visual adjunta define identidad, paleta, escalas, espaciado y adaptación.

| Área / pantalla              | Requisitos                           | Criterios de interfaz                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Acceso y completar perfil    | RF-2, RF-2.1, RNM-01/02              | Google institucional mediante backend; matrícula o número de trabajador; teléfono opcional; sesión real y ruta de retorno                                                                                                |
| Navegación por rol           | RF-3, RNU-01                         | Usuario, soporte, subencargado, administrador; solo opciones autorizadas; título de sección; mensaje ante acceso no permitido                                                                                            |
| Inicio                       | RNR-03                               | Resumen de datos reales según rol, solicitudes recientes o prioritarias, carga del equipo                                                                                                                                |
| Nuevo ticket                 | RF-1–1.5, RF-3.2, RF-4, RNF-10/12/19 | Datos del contacto de la sesión; título, categoría/subcategoría, edificio; salón opcional; máximo 50 palabras en descripción; prioridad del catálogo; sugerencias no bloqueantes; software con detalles exigidos por API |
| Listado y detalle de tickets | RNU-05/06, RNR-04/13/18              | Folio, categoría, ubicación, fecha, prioridad, estado; acceso a detalle; búsqueda por folio/texto; filtros y restablecer; vacío explícito y paginación                                                                   |
| Asignación y atención        | RF-3.3/3.5, RNF-08/17, RNU-04        | Autoasignación soporte/subencargado dentro de área; asignación administrativa; transiciones válidas; confirmación antes de finalizar o cancelar; razón para cancelar; conservar clave de idempotencia al reintentar      |
| Bitácora                     | RF-5–5.2, RF-3.3/3.4, RNF-18         | Soporte consulta; subencargado/admin registra y edita; datos históricos de ticket/reportero, participantes, inicio, fin opcional, dedicación efectiva y estado; historial inmutable de revisiones                        |
| Inventario                   | RF-7–7.4, RF-3.4, RNR-17             | Subencargado/admin; cómputo, proyector, control y adaptador; formularios condicionados por tipo; edición y baja lógica; historial de incidencias de equipo                                                               |
| Equipo de soporte            | RF-3.5, RNU-0.9                      | Solo administrador; crear, editar y desactivar/reactivar; rol, áreas y habilidades con controles explícitos/checklist; resolver asignaciones antes de baja                                                               |
| Categorías                   | RF-1.4/1.5                           | Consulta del catálogo por todos; cambios de categoría/subcategoría y prioridad solo administrador; mostrar prioridad pendiente de configurar                                                                             |
| Reportes                     | RNR-14                               | Administrador; periodo y filtros; resumen de actividad, categorías, técnicos y series diarias con datos de API                                                                                                           |
| Perfil                       | RF-1.1, RF-2                         | Identidad institucional y rol; edición únicamente de datos admitidos por API                                                                                                                                             |
| Conexión y borradores        | RNF-02/03                            | Retener localmente formularios de ticket y bitácora al perder conexión; restaurar edición y envío tras reconexión                                                                                                        |
| Estados comunes              | RNU-02/03/04/06                      | Etiquetas persistentes; obligatorios antes de enviar; validación asociada al campo; preservar datos válidos; carga, éxito, error y vacío; acciones inválidas deshabilitadas/ocultas                                      |
| Accesibilidad/adaptación     | RNU-07/08                            | Teclado, foco visible de 2 px, contraste suficiente, estados con texto además de color, controles de al menos 44 px, móvil/tableta/escritorio                                                                            |

## Diseño institucional

- Verde `#00723F`, ocre `#DD971A`, azul `#20419A`, negro `#000000`.
- Proxima Nova como fuente objetivo y fuente de sistema de respaldo cuando la licencia no está disponible; no distribuir fuentes comerciales sin licencia.
- Escudo oficial actualizado 2022: [Oficina del Secretario de Rectoría y Comunicación Institucional UABC](https://comunicacioninstitucional.uabc.mx/v1/escudo).
- Archivo original: [escudo-actualizado-2022.png](https://comunicacioninstitucional.uabc.mx/v1/sites/default/files/inline-images/escudo-actualizado-2022.png), almacenado como `public/uabc-escudo.png` sin alteración del símbolo.
- Encabezado 72 px; sidebar escritorio 256 px; contenido 40 px horizontal / 32 px vertical; tarjetas 12–16 px; controles 44 px y radio 10 px.
- Breakpoints: escritorio ≥1280, sidebar compacto 1024–1279, tableta 768–1023, móvil ≤767; navegación inferior 64 px y margen lateral móvil 16 px.

## Límites de verificación

Las latencias, disponibilidad 99.5 %, 100 usuarios concurrentes, RPO/RTO, SMTP y OAuth institucional real requieren medición o infraestructura. No son propiedades verificables solo mediante el diseño o la compilación del frontend. La API documenta los comportamientos disponibles; cuando una función del PDF depende de servidor o servicios externos, la UI no simula un resultado exitoso.
