"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import Icon from "./Icon";
import {
  Badge,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Modal,
  Notice,
  PageHead,
  Pagination,
} from "./ui";
import { api, ApiError, errorMessage, queryString } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/hooks";
import {
  areaLabels,
  formatDate,
  isActiveTicket,
  priorityLabels,
  roleHome,
  statusLabels,
  type Priority,
  type Ticket,
  type TicketEvent,
  type TicketStatus,
} from "@/lib/types";
const transitions: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_REVIEW", "IN_PROGRESS", "CANCELLED"],
  IN_REVIEW: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
const eventLabels: Record<string, string> = {
  CREATED: "Solicitud registrada",
  ASSIGNED: "Responsable asignado",
  UNASSIGNED: "Asignación retirada",
  STATUS_CHANGED: "Estado actualizado",
  PRIORITY_CHANGED: "Prioridad actualizada",
  CANCELLED: "Solicitud cancelada",
};
type Action = "status" | "assign" | "priority" | "self" | "unassign";
export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  return user ? <TicketDetailBody key={user.id + ":" + id} /> : null;
}
function TicketDetailBody() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const result = useApi<Ticket>(
    user ? `/tickets/${encodeURIComponent(id)}` : null,
  );
  const events = useApi<TicketEvent[]>(
    user ? `/tickets/${encodeURIComponent(id)}/events` : null,
  );
  const [action, setAction] = useState<Action | null>(null);
  const [status, setStatus] = useState<TicketStatus>("IN_PROGRESS");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [assigneeId, setAssignee] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState("");
  const attempt = useRef<{ body: string; key: string } | null>(null);
  const ticket = result.data;
  const candidates = useApi<{ id: string; fullName: string; email: string }[]>(
    action === "assign" && ticket?.category.supportArea
      ? `/support-members?${queryString({ supportArea: ticket.category.supportArea, active: true, page, pageSize: 10, search: debouncedSearch })}`
      : null,
  );
  if (!user) return null;
  const home = roleHome(user.role);
  const admin = user.role === "ADMIN";
  const staff = user.role === "SUPPORT" || user.role === "SUB_MANAGER";
  const mutable = !!ticket && isActiveTicket(ticket);
  const canChangeStatus =
    mutable && (admin || (staff && ticket.assignee?.id === user.id));
  function open(next: Action) {
    if (!ticket) return;
    setAction(next);
    setError("");
    setFields({});
    setNote("");
    setReason("");
    setStatus(transitions[ticket.status][0] || "IN_PROGRESS");
    setPriority(ticket.priority);
    setAssignee("");
    setSearch("");
    setPage(1);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket || !action || saving) return;
    setError("");
    setFields({});
    const errors: Record<string, string[]> = {};
    if (action === "status" && status === "CANCELLED" && !note.trim())
      errors.note = ["Explica el motivo de la cancelación."];
    if (action === "priority" && !reason.trim())
      errors.reason = ["Indica por qué necesitas cambiar la prioridad."];
    if (action === "assign" && !assigneeId)
      errors.assigneeId = ["Selecciona un miembro de soporte."];
    if (Object.keys(errors).length) {
      setFields(errors);
      return;
    }
    setSaving(true);
    try {
      let message = "";
      if (action === "status") {
        const body = JSON.stringify({
          status,
          ...(note.trim() ? { note: note.trim() } : {}),
        });
        if (attempt.current?.body !== body)
          attempt.current = { body, key: crypto.randomUUID() };
        await api(`/tickets/${ticket.id}/status`, {
          method: "PATCH",
          headers: { "Idempotency-Key": attempt.current!.key },
          body,
        });
        attempt.current = null;
        message = `Estado actualizado: ${statusLabels[status]}.`;
      } else if (action === "self") {
        await api(`/tickets/${ticket.id}/assign-self`, { method: "POST" });
        message = "El ticket se asignó a tu cuenta.";
      } else if (action === "assign") {
        await api(`/tickets/${ticket.id}/assignee`, {
          method: "PUT",
          body: JSON.stringify({ assigneeId }),
        });
        message = "Responsable asignado correctamente.";
      } else if (action === "unassign") {
        await api(`/tickets/${ticket.id}/assignee`, { method: "DELETE" });
        message = "Se retiró la asignación del ticket.";
      } else {
        await api(`/tickets/${ticket.id}/priority`, {
          method: "PATCH",
          body: JSON.stringify({ priority, reason: reason.trim() }),
        });
        message = "Prioridad actualizada correctamente.";
      }
      setSuccess(message);
      setAction(null);
      result.reload();
      events.reload();
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError) setFields(e.fields);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Link className="back-link" href={`${home}/tickets`}>
        <Icon name="back" size={16} />
        Volver a {user.role === "USER" ? "mis tickets" : "tickets de servicio"}
      </Link>
      <ErrorNotice message={result.error} retry={result.reload} />
      {success && <Notice tone="success">{success}</Notice>}
      {result.loading ? (
        <Loading label="Cargando detalle de la solicitud…" />
      ) : (
        ticket && (
          <>
            <PageHead
              eyebrow={`${ticket.code} · SOLICITUD DE SERVICIO`}
              title={ticket.title}
              description={`Registrado el ${formatDate(ticket.createdAt, true)}`}
            >
              <Badge value={ticket.status} />
              <Badge value={ticket.priority} />
            </PageHead>
            <div className="detail-grid">
              <div className="stack">
                <section className="card">
                  <div className="section-head">
                    <h2>Información de la incidencia</h2>
                    <Icon name="ticket" />
                  </div>
                  <span className="detail-label">Descripción</span>
                  <p className="detail-description">{ticket.description}</p>
                  <div className="detail-pairs">
                    <Detail label="Categoría" value={ticket.category.name} />
                    <Detail
                      label="Subcategoría"
                      value={ticket.subcategory?.name || "No aplica"}
                    />
                    <Detail label="Edificio" value={ticket.location.building} />
                    <Detail
                      label="Aula o laboratorio"
                      value={ticket.location.room || "No especificada"}
                    />
                    {ticket.category.supportArea && (
                      <Detail
                        label="Área de soporte"
                        value={areaLabels[ticket.category.supportArea]}
                      />
                    )}
                    <Detail
                      label="Última actualización"
                      value={formatDate(ticket.updatedAt, true)}
                    />
                  </div>
                  {ticket.software && (
                    <div className="detail-subsection">
                      <h4>Solicitud de software</h4>
                      <div className="detail-pairs">
                        <Detail label="Software" value={ticket.software.name} />
                        <Detail
                          label="Versión"
                          value={ticket.software.version}
                        />
                        <Detail
                          label="Referencia de coordinación"
                          value={ticket.software.coordinationApprovalReference}
                        />
                        <div>
                          <span className="detail-label">Descarga</span>
                          {/^https?:\/\//i.test(ticket.software.downloadUrl) ? (
                            <a
                              className="text-link"
                              href={ticket.software.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Abrir enlace
                              <Icon name="arrow" size={14} />
                            </a>
                          ) : (
                            <span className="detail-value">
                              {ticket.software.downloadUrl}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {ticket.inventoryItem && (
                    <div className="detail-subsection">
                      <h4>Equipo relacionado</h4>
                      <p className="detail-value">
                        {ticket.inventoryItem.model} ·{" "}
                        {ticket.inventoryItem.assetCode ||
                          "Sin número de patrimonio"}
                      </p>
                      {["ADMIN", "SUB_MANAGER"].includes(user.role) && (
                        <Link className="text-link" href={`${home}/inventario`}>
                          Consultar inventario
                          <Icon name="arrow" size={14} />
                        </Link>
                      )}
                    </div>
                  )}
                </section>
                <section className="card">
                  <div className="section-head">
                    <div>
                      <h2>Historial de seguimiento</h2>
                      <p>Cada avance de tu solicitud, en un solo lugar.</p>
                    </div>
                    <Icon name="clock" />
                  </div>
                  <ErrorNotice message={events.error} retry={events.reload} />
                  {events.loading ? (
                    <Loading />
                  ) : events.data?.length ? (
                    <ol className="timeline">
                      {events.data.map((event) => (
                        <li key={event.id}>
                          <span className="timeline-marker" />
                          <strong>
                            {eventLabels[event.type] ||
                              "Actualización de la solicitud"}
                          </strong>
                          {event.toStatus && (
                            <p>
                              {event.fromStatus
                                ? `${statusLabels[event.fromStatus]} → `
                                : ""}
                              {statusLabels[event.toStatus]}
                            </p>
                          )}
                          {typeof event.metadata?.note === "string" && (
                            <p>{event.metadata.note}</p>
                          )}
                          {typeof event.metadata?.reason === "string" && (
                            <p>Motivo: {event.metadata.reason}</p>
                          )}
                          {event.type === "PRIORITY_CHANGED" &&
                            typeof event.metadata?.priority === "string" && (
                              <p>
                                Prioridad:{" "}
                                {priorityLabels[
                                  event.metadata.priority as Priority
                                ] || event.metadata.priority}
                              </p>
                            )}
                          <time dateTime={event.createdAt}>
                            {formatDate(event.createdAt, true)}
                            {event.actor ? ` · ${event.actor.fullName}` : ""}
                          </time>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    events.data && (
                      <Empty
                        icon="clock"
                        title="Sin movimientos registrados"
                        hint="Las actualizaciones de la solicitud aparecerán aquí."
                      />
                    )
                  )}
                </section>
              </div>
              <aside className="stack">
                <section className="card">
                  <div className="section-head">
                    <h3>Responsable del servicio</h3>
                    <Icon name="users" />
                  </div>
                  {ticket.assignee ? (
                    <div className="contact-card" style={{ margin: 0 }}>
                      <span className="avatar">
                        {ticket.assignee.fullName[0]}
                      </span>
                      <div>
                        <strong>{ticket.assignee.fullName}</strong>
                        <p>Equipo de soporte técnico</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="badge">Sin asignar</span>
                      <p className="caption" style={{ marginTop: 12 }}>
                        La solicitud está pendiente de ser asignada a un miembro
                        del equipo.
                      </p>
                    </>
                  )}
                </section>
                {ticket.reporter && (
                  <section className="card">
                    <div className="section-head">
                      <h3>Datos de contacto</h3>
                      <Icon name="user" />
                    </div>
                    <div className="stack" style={{ gap: 14 }}>
                      <Detail
                        label="Reportado por"
                        value={ticket.reporter.fullName}
                      />
                      <Detail
                        label="Correo institucional"
                        value={ticket.reporter.email}
                      />
                      <Detail
                        label="Teléfono"
                        value={ticket.reporter.phone || "No proporcionado"}
                      />
                    </div>
                    <p className="caption" style={{ marginTop: 18 }}>
                      Información de contacto registrada al crear la solicitud.
                    </p>
                  </section>
                )}
                {mutable && (admin || staff) && (
                  <section className="card">
                    <div className="section-head">
                      <h3>Gestionar solicitud</h3>
                    </div>
                    <div className="detail-actions">
                      {staff && !ticket.assignee && (
                        <button
                          className="btn btn-primary"
                          onClick={() => open("self")}
                        >
                          <Icon name="user" size={17} />
                          Asignarme ticket
                        </button>
                      )}
                      {admin && (
                        <button
                          className="btn btn-primary"
                          onClick={() => open("assign")}
                        >
                          <Icon name="users" size={17} />
                          {ticket.assignee
                            ? "Reasignar responsable"
                            : "Asignar responsable"}
                        </button>
                      )}
                      {canChangeStatus && (
                        <button
                          className="btn btn-outline"
                          onClick={() => open("status")}
                        >
                          <Icon name="refresh" size={17} />
                          Actualizar estado
                        </button>
                      )}
                      {admin && (
                        <button
                          className="btn btn-outline"
                          onClick={() => open("priority")}
                        >
                          <Icon name="alert" size={17} />
                          Cambiar prioridad
                        </button>
                      )}
                      {admin && ticket.assignee && (
                        <button
                          className="btn btn-quiet"
                          onClick={() => open("unassign")}
                        >
                          Retirar asignación
                        </button>
                      )}
                      {staff &&
                        ticket.assignee &&
                        ticket.assignee.id !== user.id && (
                          <p className="caption">
                            El responsable asignado puede actualizar el estado
                            de esta solicitud.
                          </p>
                        )}
                    </div>
                  </section>
                )}
                {!mutable && (
                  <Notice
                    tone={ticket.status === "COMPLETED" ? "success" : "info"}
                  >
                    {ticket.status === "COMPLETED"
                      ? `Solicitud completada el ${formatDate(ticket.completedAt, true)}.`
                      : `Solicitud cancelada el ${formatDate(ticket.cancelledAt, true)}.`}
                  </Notice>
                )}
              </aside>
            </div>
          </>
        )
      )}
      {action && ticket && (
        <Modal
          title={
            action === "status"
              ? "Actualizar estado"
              : action === "assign"
                ? "Asignar responsable"
                : action === "priority"
                  ? "Cambiar prioridad"
                  : action === "self"
                    ? "Asignarme esta solicitud"
                    : "Retirar asignación"
          }
          onClose={() => {
            if (!saving) setAction(null);
          }}
        >
          <form onSubmit={submit} noValidate>
            <p className="caption" style={{ marginBottom: 20 }}>
              {ticket.code} · {ticket.title}
            </p>
            {action === "status" && (
              <>
                <Field
                  id="new-status"
                  label="Nuevo estado"
                  required
                  error={fields.status?.[0]}
                >
                  <select
                    id="new-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TicketStatus)}
                  >
                    {transitions[ticket.status].map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id="status-note"
                  label={
                    status === "CANCELLED"
                      ? "Motivo de cancelación"
                      : "Nota de seguimiento"
                  }
                  required={status === "CANCELLED"}
                  error={fields.note?.[0]}
                  hint="Máximo 500 caracteres."
                >
                  <textarea
                    id="status-note"
                    value={note}
                    maxLength={500}
                    onChange={(e) => setNote(e.target.value)}
                    aria-invalid={!!fields.note?.length}
                  />
                </Field>
                {["COMPLETED", "CANCELLED"].includes(status) && (
                  <Notice tone="warning">
                    {status === "COMPLETED"
                      ? "Al confirmar, se marcará la atención como completada."
                      : "Al confirmar, se cancelará la solicitud."}{" "}
                    Este es un estado final y la solicitud no podrá reabrirse.
                  </Notice>
                )}
              </>
            )}
            {action === "priority" && (
              <>
                <Field
                  id="new-priority"
                  label="Prioridad"
                  required
                  error={fields.priority?.[0]}
                >
                  <select
                    id="new-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                  >
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id="priority-reason"
                  label="Motivo del cambio"
                  required
                  error={fields.reason?.[0]}
                >
                  <textarea
                    id="priority-reason"
                    value={reason}
                    maxLength={500}
                    onChange={(e) => setReason(e.target.value)}
                    aria-invalid={!!fields.reason?.length}
                  />
                </Field>
              </>
            )}
            {action === "assign" && (
              <>
                <Field id="assignee-search" label="Buscar en el equipo">
                  <input
                    id="assignee-search"
                    type="search"
                    value={search}
                    maxLength={100}
                    placeholder="Nombre o correo"
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </Field>
                <p className="caption" style={{ marginBottom: 12 }}>
                  Se muestran miembros activos del área{" "}
                  {ticket.category.supportArea
                    ? areaLabels[ticket.category.supportArea]
                    : ""}
                  .
                </p>
                <ErrorNotice
                  message={candidates.error}
                  retry={candidates.reload}
                />
                {candidates.loading ? (
                  <Loading />
                ) : candidates.data?.length ? (
                  <fieldset className="candidate-list">
                    <legend className="sr-only">
                      Selecciona un responsable
                    </legend>
                    {candidates.data.map((c) => (
                      <label className="candidate" key={c.id}>
                        <input
                          type="radio"
                          name="assignee"
                          value={c.id}
                          checked={assigneeId === c.id}
                          onChange={() => setAssignee(c.id)}
                        />
                        <span>
                          <strong>{c.fullName}</strong>
                          <small>{c.email}</small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  candidates.data && (
                    <Empty
                      icon="users"
                      title="No hay miembros disponibles"
                      hint="Comprueba el área del ticket o registra un miembro de soporte."
                    />
                  )
                )}
                {fields.assigneeId && (
                  <p className="field-error" role="alert">
                    {fields.assigneeId[0]}
                  </p>
                )}
                <Pagination meta={candidates.meta} onPage={setPage} />
              </>
            )}
            {action === "self" && (
              <p>
                Esta solicitud se asignará a tu cuenta. Podrás actualizar su
                estado conforme avances con la atención.
              </p>
            )}
            {action === "unassign" && (
              <Notice tone="warning">
                La solicitud quedará sin responsable. Podrás asignarla
                nuevamente desde su detalle.
              </Notice>
            )}
            <ErrorNotice message={error} />
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                type="button"
                disabled={saving}
                onClick={() => setAction(null)}
              >
                Volver
              </button>
              <button
                className={`btn ${action === "unassign" || (action === "status" && status === "CANCELLED") ? "btn-danger" : "btn-primary"}`}
                disabled={saving || (action === "assign" && !assigneeId)}
              >
                {saving
                  ? "Guardando…"
                  : action === "status" && status === "COMPLETED"
                    ? "Confirmar resolución"
                    : action === "status" && status === "CANCELLED"
                      ? "Confirmar cancelación"
                      : action === "self"
                        ? "Confirmar asignación"
                        : action === "unassign"
                          ? "Retirar asignación"
                          : "Confirmar cambios"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}
