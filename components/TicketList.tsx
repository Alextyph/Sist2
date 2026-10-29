"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import Icon from "./Icon";
import {
  ErrorNotice,
  Field,
  Loading,
  PageHead,
  Pagination,
  TicketTable,
} from "./ui";
import { useApi, useDebounced } from "@/lib/hooks";
import { queryString } from "@/lib/api";
import {
  areaLabels,
  priorityLabels,
  roleHome,
  statusLabels,
  type Category,
  type Ticket,
} from "@/lib/types";
const initial = {
  search: "",
  status: "",
  priority: "",
  categoryId: "",
  supportArea: "",
  assignment: "",
  assignedTo: "",
  from: "",
  to: "",
  sort: "createdAt",
  order: "desc",
};
function dateBoundary(value: string, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(value + "T" + (end ? "23:59:59.999" : "00:00:00"));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
export default function TicketList() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(initial);
  const [page, setPage] = useState(1);
  const search = useDebounced(filters.search.trim());
  const catalog = useApi<Category[]>(user ? "/categories" : null);
  const support = !!user && user.role !== "USER";
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const assignment = q.get("assignment");
    const assignedTo = q.get("assignedTo") || "";
    setFilters((f) => ({
      ...f,
      ...(assignment && ["mine", "unassigned", "assigned"].includes(assignment)
        ? { assignment }
        : {}),
      ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        assignedTo,
      )
        ? { assignedTo }
        : {}),
    }));
  }, []);
  const fromBoundary = dateBoundary(filters.from);
  const toBoundary = dateBoundary(filters.to, true);
  const fromError =
    filters.from && !fromBoundary ? "Selecciona una fecha válida." : "";
  const toError =
    filters.to && !toBoundary
      ? "Selecciona una fecha válida."
      : filters.from && filters.to && filters.from > filters.to
        ? "La fecha final debe ser igual o posterior a la inicial."
        : "";
  const params = queryString({
    page,
    pageSize: 10,
    search,
    status: filters.status,
    priority: filters.priority,
    categoryId: filters.categoryId,
    ...(support
      ? {
          assignment: filters.assignment,
          assignedTo: filters.assignedTo,
          supportArea: filters.supportArea,
        }
      : {}),
    createdFrom: fromBoundary,
    createdTo: toBoundary,
    sort: filters.sort,
    order: filters.order,
  });
  const result = useApi<Ticket[]>(
    user && !fromError && !toError ? `/tickets?${params}` : null,
  );
  if (!user) return null;
  const set = (key: keyof typeof initial, value: string) => {
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === "assignment" ? { assignedTo: "" } : {}),
    }));
    setPage(1);
  };
  const filtered = Object.entries(filters).some(
    ([key, value]) => value !== initial[key as keyof typeof initial],
  );
  return (
    <>
      <PageHead
        eyebrow={support ? "GESTIÓN DE SERVICIO" : "MIS SOLICITUDES"}
        title={support ? "Tickets de servicio" : "Mis tickets"}
        description={
          support
            ? "Consulta, organiza y atiende las incidencias de tu área."
            : "Consulta el estado y el seguimiento de cada solicitud."
        }
      >
        {!support && (
          <Link href="/usuario/nuevo" className="btn btn-primary">
            <Icon name="plus" size={18} />
            Crear ticket
          </Link>
        )}
        <button className="btn btn-outline" onClick={result.reload}>
          <Icon name="refresh" size={16} />
          Actualizar
        </button>
      </PageHead>
      {support && (
        <div
          className="filter-tabs"
          role="group"
          aria-label="Asignación de tickets"
        >
          {[
            ["", "Todos los tickets"],
            ["mine", "Asignados a mí"],
            ["unassigned", "Sin asignar"],
            ["assigned", "Asignados"],
          ].map(([value, label]) => (
            <button
              type="button"
              aria-pressed={filters.assignment === value}
              key={value}
              onClick={() => set("assignment", value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <section className="filter-panel" aria-label="Filtros de tickets">
        <div className="filters">
          <Field id="ticket-search" label="Buscar ticket">
            <div className="search-input">
              <Icon name="search" size={18} />
              <input
                id="ticket-search"
                type="search"
                placeholder="Folio o título de la solicitud"
                value={filters.search}
                maxLength={100}
                onChange={(e) => set("search", e.target.value)}
              />
            </div>
          </Field>
          <Field id="ticket-status" label="Estado">
            <select
              id="ticket-status"
              value={filters.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="">Todos los estados</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="ticket-priority" label="Prioridad">
            <select
              id="ticket-priority"
              value={filters.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              <option value="">Todas las prioridades</option>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <button
            className="btn btn-quiet"
            disabled={!filtered}
            onClick={() => {
              setFilters(initial);
              setPage(1);
            }}
          >
            <Icon name="refresh" size={15} />
            Restablecer
          </button>
        </div>
        <details className="advanced-filters">
          <summary>Más filtros</summary>
          <div className="filters" style={{ marginTop: 16 }}>
            <Field id="ticket-category" label="Categoría">
              <select
                id="ticket-category"
                value={filters.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {catalog.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            {support && (
              <Field id="ticket-area" label="Área de soporte">
                <select
                  id="ticket-area"
                  value={filters.supportArea}
                  onChange={(e) => set("supportArea", e.target.value)}
                >
                  <option value="">Todas mis áreas</option>
                  {(user.role === "ADMIN"
                    ? Object.keys(areaLabels)
                    : user.supportAreas
                  ).map((a) => (
                    <option key={a} value={a}>
                      {areaLabels[a as keyof typeof areaLabels]}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field id="ticket-from" label="Desde" error={fromError}>
              <input
                id="ticket-from"
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => set("from", e.target.value)}
              />
            </Field>
            <Field id="ticket-to" label="Hasta" error={toError}>
              <input
                id="ticket-to"
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => set("to", e.target.value)}
              />
            </Field>
            <Field id="ticket-sort" label="Ordenar por">
              <select
                id="ticket-sort"
                value={filters.sort}
                onChange={(e) => set("sort", e.target.value)}
              >
                <option value="createdAt">Fecha de creación</option>
                <option value="updatedAt">Última actualización</option>
                <option value="priority">Prioridad</option>
                <option value="code">Folio</option>
                <option value="status">Estado</option>
              </select>
            </Field>
            <Field id="ticket-order" label="Orden">
              <select
                id="ticket-order"
                value={filters.order}
                onChange={(e) => set("order", e.target.value)}
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </Field>
          </div>
          <ErrorNotice message={catalog.error} retry={catalog.reload} />
        </details>
      </section>
      <div aria-live="polite">
        {filters.assignedTo && (
          <p className="caption" style={{ marginBottom: 16 }}>
            Mostrando tickets del miembro seleccionado. Usa «Restablecer» para
            consultar todos.
          </p>
        )}
      </div>
      <ErrorNotice message={result.error} retry={result.reload} />
      <section className="card card-flush">
        <div className="section-head">
          <div>
            <h2>{support ? "Bandeja de tickets" : "Todas tus solicitudes"}</h2>
            <p>
              {result.meta
                ? `${result.meta.total} solicitudes encontradas`
                : "Resultados de tu búsqueda"}
            </p>
          </div>
          <span className="caption">Actualizado desde el servicio</span>
        </div>
        {result.loading ? (
          <Loading />
        ) : (
          result.data && (
            <TicketTable
              rows={result.data}
              basePath={`${roleHome(user.role)}/tickets`}
              showAssignee={support}
            />
          )
        )}
        <Pagination meta={result.meta} onPage={setPage} />
      </section>
    </>
  );
}
