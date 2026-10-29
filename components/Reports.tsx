"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import Icon from "./Icon";
import {
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Notice,
  PageHead,
  Pagination,
  Stat,
} from "./ui";
import { api, ApiError, errorMessage, queryString } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/hooks";
import {
  areaLabels,
  roleLabels,
  type Category,
  type Role,
  type SupportArea,
} from "@/lib/types";

interface ActivityReport {
  summary: {
    ticketsCreated: number;
    ticketsCompleted: number;
    pending: number;
    averageResolutionMinutes: number;
  };
  byCategory: Array<{ categoryId: string; category: string; count: number }>;
  byTechnician: Array<{
    technicianId: string;
    name: string;
    completed: number;
    active: number;
  }>;
  daily: Array<{ date: string; created: number; completed: number }>;
}

interface ReportFilters {
  from: string;
  to: string;
  supportArea: string;
  categoryId: string;
  technicianId: string;
}
interface TechnicianOption {
  id: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}
type FormErrors = Partial<Record<keyof ReportFilters, string>>;

function currentPeriod(): ReportFilters {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "America/Tijuana",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (part: string) =>
    parts.find((value) => value.type === part)?.value ?? "";
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  return {
    from: `${today.slice(0, 7)}-01`,
    to: today,
    supportArea: "",
    categoryId: "",
    technicianId: "",
  };
}

/** Report dates are calendar labels, not UTC instants: never shift a series day into another day. */
function calendarLabel(value: string, short = false): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return short
    ? `${day} ${months[month - 1]?.slice(0, 3)}`
    : `${day} de ${months[month - 1]} de ${year}`;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function durationLabel(minutes: number): string {
  if (!minutes) return "0 min";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  return `${Math.floor(rounded / 60)} h${rounded % 60 ? ` ${rounded % 60} min` : ""}`;
}

function DailyChart({ rows }: { rows: ActivityReport["daily"] }) {
  const titleId = useId();
  const descriptionId = useId();
  const width = 760,
    height = 250,
    left = 38,
    top = 18,
    right = 20,
    bottom = 36;
  const maxValue = Math.max(
    1,
    ...rows.map((row) => Math.max(row.created, row.completed)),
  );
  const maximum = Math.max(4, Math.ceil(maxValue / 4) * 4);
  const plotWidth = width - left - right,
    plotHeight = height - top - bottom;
  const x = (index: number) =>
    left +
    (rows.length <= 1
      ? plotWidth / 2
      : (index * plotWidth) / (rows.length - 1));
  const y = (count: number) => top + plotHeight * (1 - count / maximum);
  const points = (key: "created" | "completed") =>
    rows.map((row, index) => `${x(index)},${y(row[key])}`).join(" ");
  const labelIndexes = [
    ...new Set([
      0,
      Math.floor((rows.length - 1) / 3),
      Math.floor(((rows.length - 1) * 2) / 3),
      rows.length - 1,
    ]),
  ].filter((index) => index >= 0);
  const createdTotal = rows.reduce((sum, row) => sum + row.created, 0);
  const completedTotal = rows.reduce((sum, row) => sum + row.completed, 0);
  return (
    <>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 16 }}
      >
        <span
          className="caption"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <span
            aria-hidden="true"
            style={{ width: 24, borderTop: "3px solid var(--green, #00723F)" }}
          />
          Tickets creados
        </span>
        <span
          className="caption"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <span
            aria-hidden="true"
            style={{ width: 24, borderTop: "3px dashed var(--blue, #20419A)" }}
          />
          Tickets completados
        </span>
      </div>
      <svg
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          minHeight: 170,
        }}
      >
        <title id={titleId}>Actividad diaria de tickets</title>
        <desc id={descriptionId}>
          {createdTotal} tickets creados y {completedTotal} completados en el
          periodo. La tabla «Datos diarios» contiene todos los valores por
          fecha.
        </desc>
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = (tick * maximum) / 4;
          return (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={y(value)}
                y2={y(value)}
                stroke="#E3E6E4"
                strokeDasharray={tick ? "3 4" : undefined}
              />
              <text
                x={left - 10}
                y={y(value) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#5F6B64"
              >
                {value}
              </text>
            </g>
          );
        })}
        <polyline
          points={points("created")}
          fill="none"
          stroke="#00723F"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <polyline
          points={points("completed")}
          fill="none"
          stroke="#20419A"
          strokeWidth="3"
          strokeDasharray="7 5"
          strokeLinejoin="round"
        />
        {rows.length <= 31 &&
          rows.map((row, index) => (
            <g key={row.date}>
              <circle cx={x(index)} cy={y(row.created)} r="3" fill="#00723F">
                <title>
                  {calendarLabel(row.date)}: {row.created} creados
                </title>
              </circle>
              <circle cx={x(index)} cy={y(row.completed)} r="3" fill="#20419A">
                <title>
                  {calendarLabel(row.date)}: {row.completed} completados
                </title>
              </circle>
            </g>
          ))}
        {labelIndexes.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={height - 9}
            fontSize="11"
            fill="#5F6B64"
            textAnchor={
              index === 0 && rows.length > 1
                ? "start"
                : index === rows.length - 1 && rows.length > 1
                  ? "end"
                  : "middle"
            }
          >
            {calendarLabel(rows[index].date, true)}
          </text>
        ))}
      </svg>
    </>
  );
}

export default function Reports() {
  const { user, loading: authLoading } = useAuth();
  const permitted = user?.role === "ADMIN";
  const [filters, setFilters] = useState<ReportFilters>(currentPeriod);
  const [applied, setApplied] = useState<ReportFilters>(currentPeriod);
  const [errors, setErrors] = useState<FormErrors>({});
  const [report, setReport] = useState<ActivityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberActive, setMemberActive] = useState("true");
  const [memberPage, setMemberPage] = useState(1);
  const [selectedTechnician, setSelectedTechnician] =
    useState<TechnicianOption | null>(null);
  const [appliedTechnicianName, setAppliedTechnicianName] = useState("");
  const debouncedSearch = useDebounced(memberSearch.trim());
  const categories = useApi<Category[]>(
    permitted ? "/categories?includeInactive=true" : null,
  );
  const members = useApi<TechnicianOption[]>(
    permitted
      ? `/support-members?${queryString({ search: debouncedSearch, active: memberActive, page: memberPage, pageSize: 20 })}`
      : null,
  );

  useEffect(() => {
    if (!permitted) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setReport(null);
    api<ActivityReport>(`/reports/activity?${queryString({ ...applied })}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setReport(data);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(cause));
        if (cause instanceof ApiError)
          setErrors(
            Object.fromEntries(
              Object.entries(cause.fields).map(([key, values]) => [
                key.replace(/^query\./, ""),
                values.join(" "),
              ]),
            ),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [permitted, applied, revision]);

  function update<K extends keyof ReportFilters>(
    key: K,
    value: ReportFilters[K],
  ) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "supportArea" ? { categoryId: "" } : {}),
    }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!validDate(filters.from))
      nextErrors.from = "Selecciona una fecha de inicio válida.";
    if (!validDate(filters.to))
      nextErrors.to = "Selecciona una fecha de fin válida.";
    if (!nextErrors.from && !nextErrors.to && filters.from > filters.to)
      nextErrors.to = "La fecha final debe ser igual o posterior a la inicial.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setAppliedTechnicianName(selectedTechnician?.fullName ?? "");
    setApplied({ ...filters });
  }

  function resetFilters() {
    const next = currentPeriod();
    setFilters(next);
    setApplied(next);
    setErrors({});
    setMemberSearch("");
    setMemberActive("true");
    setMemberPage(1);
    setSelectedTechnician(null);
    setAppliedTechnicianName("");
  }

  const visibleCategories = (categories.data ?? []).filter(
    (category) =>
      !filters.supportArea || category.supportArea === filters.supportArea,
  );
  const selectedMemberOnPage = members.data?.some(
    (member) => member.id === filters.technicianId,
  );
  const filtersChanged = JSON.stringify(filters) !== JSON.stringify(applied);
  const byCategoryMaximum = Math.max(
    1,
    ...(report?.byCategory ?? []).map((row) => row.count),
  );
  const hasActivity =
    !!report &&
    (report.summary.ticketsCreated > 0 ||
      report.summary.ticketsCompleted > 0 ||
      report.summary.pending > 0);

  if (authLoading) return <Loading />;
  if (!permitted)
    return (
      <Notice tone="error">
        No cuentas con permisos para consultar los reportes. Esta sección está
        disponible para administración.
      </Notice>
    );

  return (
    <>
      <PageHead
        eyebrow="Administración"
        title="Reportes de actividad"
        description="Conoce el volumen de solicitudes, los tiempos de atención y la carga del equipo."
      >
        <button
          className="btn btn-outline"
          type="button"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          <Icon name="refresh" size={18} />
          Actualizar
        </button>
      </PageHead>

      <form className="card stack" onSubmit={applyFilters} noValidate>
        <div className="section-head">
          <h2>Periodo y filtros</h2>
          <span className="caption">Los campos con * son obligatorios.</span>
        </div>
        <div className="form-grid">
          <Field label="Desde" id="report-from" required error={errors.from}>
            <input
              id="report-from"
              type="date"
              required
              value={filters.from}
              aria-invalid={!!errors.from}
              aria-describedby={errors.from ? "report-from-error" : undefined}
              onChange={(event) => update("from", event.target.value)}
            />
          </Field>
          <Field label="Hasta" id="report-to" required error={errors.to}>
            <input
              id="report-to"
              type="date"
              required
              min={filters.from || undefined}
              value={filters.to}
              aria-invalid={!!errors.to}
              aria-describedby={errors.to ? "report-to-error" : undefined}
              onChange={(event) => update("to", event.target.value)}
            />
          </Field>
          <Field
            label="Área de soporte"
            id="report-area"
            error={errors.supportArea}
          >
            <select
              id="report-area"
              value={filters.supportArea}
              onChange={(event) => update("supportArea", event.target.value)}
            >
              <option value="">Todas las áreas</option>
              {Object.entries(areaLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Categoría"
            id="report-category"
            error={errors.categoryId}
          >
            <select
              id="report-category"
              value={filters.categoryId}
              disabled={categories.loading}
              onChange={(event) => update("categoryId", event.target.value)}
            >
              <option value="">
                {categories.loading
                  ? "Cargando categorías…"
                  : "Todas las categorías"}
              </option>
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.isActive === false ? " (inactiva)" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {categories.error && (
          <ErrorNotice
            message={`No se pudo cargar el filtro de categorías. ${categories.error}`}
            retry={categories.reload}
          />
        )}
        <details
          style={{
            borderTop: "1px solid var(--line, #E3E6E4)",
            paddingTop: 16,
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              minHeight: 44,
              display: "list-item",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Filtrar por técnico
            {selectedTechnician ? `: ${selectedTechnician.fullName}` : ""}
          </summary>
          <div className="form-grid" style={{ paddingTop: 12 }}>
            <Field
              label="Buscar técnico"
              id="report-technician-search"
              hint="Busca por nombre, correo o identificador institucional."
            >
              <input
                id="report-technician-search"
                type="search"
                value={memberSearch}
                placeholder="Nombre o correo institucional"
                onChange={(event) => {
                  setMemberSearch(event.target.value);
                  setMemberPage(1);
                }}
              />
            </Field>
            <Field label="Situación del técnico" id="report-technician-active">
              <select
                id="report-technician-active"
                value={memberActive}
                onChange={(event) => {
                  setMemberActive(event.target.value);
                  setMemberPage(1);
                }}
              >
                <option value="true">Técnicos activos</option>
                <option value="false">Técnicos inactivos</option>
              </select>
            </Field>
            <Field
              label="Técnico responsable"
              id="report-technician"
              error={errors.technicianId}
              hint="El reporte usa al responsable actual o final del ticket."
            >
              <select
                id="report-technician"
                value={filters.technicianId}
                disabled={members.loading}
                onChange={(event) => {
                  const member =
                    members.data?.find(
                      (candidate) => candidate.id === event.target.value,
                    ) ?? null;
                  setSelectedTechnician(member);
                  update("technicianId", event.target.value);
                }}
              >
                <option value="">Todos los técnicos</option>
                {filters.technicianId && !selectedMemberOnPage && (
                  <option value={filters.technicianId}>
                    {selectedTechnician?.fullName || "Técnico seleccionado"}
                  </option>
                )}
                {(members.data ?? []).map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} · {roleLabels[member.role]}
                    {!member.isActive ? " (inactivo)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {members.loading && <Loading label="Cargando técnicos…" />}
          {members.error && (
            <ErrorNotice message={members.error} retry={members.reload} />
          )}
          {!members.loading && !members.error && !members.data?.length && (
            <p className="caption">
              No se encontraron técnicos con estos criterios. Puedes ajustar la
              búsqueda o la situación.
            </p>
          )}
          <Pagination meta={members.meta} onPage={setMemberPage} />
        </details>
        <div className="row-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <p className="caption">
            Fechas del calendario institucional.{" "}
            {filtersChanged
              ? "Aplica los filtros para actualizar el reporte."
              : "El reporte corresponde a los filtros aplicados."}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button
              className="btn btn-quiet"
              type="button"
              onClick={resetFilters}
            >
              Restablecer
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              <Icon name="filter" size={17} />
              {loading ? "Consultando…" : "Aplicar filtros"}
            </button>
          </div>
        </div>
      </form>

      <div style={{ marginTop: 24 }} aria-busy={loading}>
        {loading && <Loading label="Generando reporte de actividad…" />}
        {error && (
          <ErrorNotice
            message={error}
            retry={() => setRevision((value) => value + 1)}
          />
        )}
        {report && (
          <div className="stack">
            <div className="row-between" style={{ flexWrap: "wrap", gap: 12 }}>
              <h2>Resumen del periodo</h2>
              <p className="caption">
                {calendarLabel(applied.from)} — {calendarLabel(applied.to)}
              </p>
            </div>
            {(applied.supportArea ||
              applied.categoryId ||
              applied.technicianId) && (
              <p className="caption">
                Filtros aplicados:{" "}
                {[
                  applied.supportArea
                    ? areaLabels[applied.supportArea as SupportArea]
                    : "",
                  applied.categoryId
                    ? categories.data?.find(
                        (category) => category.id === applied.categoryId,
                      )?.name || "Categoría seleccionada"
                    : "",
                  applied.technicianId
                    ? appliedTechnicianName || "Técnico seleccionado"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <div
              className="grid"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
              }}
            >
              <Stat
                label="Tickets creados"
                n={report.summary.ticketsCreated}
                icon="ticket"
                tone="green"
                hint="Registrados durante el periodo"
              />
              <Stat
                label="Tickets completados"
                n={report.summary.ticketsCompleted}
                icon="check"
                tone="blue"
                hint="Finalizados durante el periodo"
              />
              <Stat
                label="Pendientes"
                n={report.summary.pending}
                icon="clock"
                tone="ochre"
                hint="Estado actual de los creados en el periodo"
              />
              <Stat
                label="Tiempo medio de resolución"
                n={durationLabel(report.summary.averageResolutionMinutes)}
                icon="chart"
                tone="green"
                hint="De los tickets completados en el periodo"
              />
            </div>
            <section className="card" aria-labelledby="daily-report-title">
              <div className="section-head">
                <div>
                  <h2 id="daily-report-title">Actividad diaria</h2>
                  <p className="caption">
                    Creación y finalización de solicitudes a lo largo del
                    periodo.
                  </p>
                </div>
                <span className="icon-box icon-green">
                  <Icon name="chart" />
                </span>
              </div>
              {hasActivity ? (
                <DailyChart rows={report.daily} />
              ) : (
                <Empty
                  icon="chart"
                  title="Sin actividad en este periodo"
                  hint="No hay tickets creados o completados con los filtros aplicados. Prueba con otras fechas."
                />
              )}
              <details style={{ marginTop: 16 }}>
                <summary
                  style={{
                    cursor: "pointer",
                    minHeight: 44,
                    display: "list-item",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Datos diarios ({report.daily.length} días)
                </summary>
                <div
                  style={{ maxHeight: 360, overflow: "auto" }}
                  tabIndex={0}
                  role="region"
                  aria-label="Datos diarios del reporte"
                >
                  <table>
                    <caption className="sr-only">
                      Tickets creados y completados por día
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Fecha</th>
                        <th scope="col">Creados</th>
                        <th scope="col">Completados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.daily.map((day) => (
                        <tr key={day.date}>
                          <th scope="row">{calendarLabel(day.date)}</th>
                          <td>{day.created}</td>
                          <td>{day.completed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
            <div
              className="grid"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
                alignItems: "start",
              }}
            >
              <section className="card" aria-labelledby="category-report-title">
                <div className="section-head">
                  <div>
                    <h2 id="category-report-title">
                      Solicitudes por categoría
                    </h2>
                    <p className="caption">Tickets creados en el periodo.</p>
                  </div>
                  <Icon name="folder" />
                </div>
                {!report.byCategory.length ? (
                  <Empty
                    icon="folder"
                    title="Sin categorías para mostrar"
                    hint="No hay solicitudes que coincidan con los filtros."
                  />
                ) : (
                  <div style={{ display: "grid", gap: 18 }}>
                    {report.byCategory.map((row) => (
                      <div key={row.categoryId}>
                        <div
                          className="row-between"
                          style={{
                            gap: 12,
                            alignItems: "baseline",
                            marginBottom: 7,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>{row.category}</span>
                          <strong>{row.count}</strong>
                        </div>
                        <div
                          aria-hidden="true"
                          style={{
                            height: 9,
                            background: "#EAF2EE",
                            borderRadius: 5,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${(row.count * 100) / byCategoryMaximum}%`,
                              background: "#00723F",
                              borderRadius: 5,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <section
                className="card"
                aria-labelledby="technician-report-title"
              >
                <div className="section-head">
                  <div>
                    <h2 id="technician-report-title">Actividad del equipo</h2>
                    <p className="caption">
                      Responsables de las solicitudes del periodo.
                    </p>
                  </div>
                  <Icon name="users" />
                </div>
                {!report.byTechnician.length ? (
                  <Empty
                    icon="users"
                    title="Sin actividad del equipo"
                    hint="No hay técnicos relacionados con los filtros aplicados."
                  />
                ) : (
                  <div
                    style={{ overflowX: "auto" }}
                    tabIndex={0}
                    role="region"
                    aria-label="Actividad por técnico"
                  >
                    <table>
                      <caption className="sr-only">
                        Tickets activos y completados por técnico
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Técnico</th>
                          <th scope="col">Completados</th>
                          <th scope="col">Activos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.byTechnician.map((row) => (
                          <tr key={row.technicianId}>
                            <th scope="row">{row.name}</th>
                            <td>{row.completed}</td>
                            <td>{row.active}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
            <p className="caption">
              Los completados pueden incluir tickets creados antes del periodo.
              «Pendientes» refleja el estado actual de las solicitudes creadas
              en estas fechas. Los nombres de categorías y técnicos son los
              vigentes.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
