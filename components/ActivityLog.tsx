"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError, errorMessage, queryString } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/hooks";
import { formatDate, roleLabels } from "@/lib/types";
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
import "./inventory-activity.css";

type ActivityStatus = "IN_PROGRESS" | "COMPLETED";
interface Participant {
  id: string;
  fullName: string;
  role?: keyof typeof roleLabels;
}
interface Activity {
  id: string;
  ticket: { id: string; code: string; title: string };
  failure: string;
  activity: string;
  participants: Participant[];
  serviceStartedAt: string;
  serviceEndedAt: string | null;
  timeSpentMinutes: number;
  status: ActivityStatus;
  createdAt: string;
  updatedAt?: string;
  reporter?: { fullName: string; email: string; phone: string | null };
  createdBy?: { id: string; fullName: string };
}
interface TicketChoice {
  id: string;
  code: string;
  title: string;
  status: ActivityStatus;
  category: { name: string };
  location: { building: string; room: string | null };
}
interface Revision {
  id: string;
  changedBy: { id: string; fullName: string };
  previousData: Record<string, unknown>;
  newData: Record<string, unknown>;
  createdAt: string;
}
interface ActivityFormValues {
  ticketId: string;
  ticketCode: string;
  ticketTitle: string;
  activity: string;
  participantIds: string[];
  serviceStartedAt: string;
  serviceEndedAt: string;
  timeSpentMinutes: string;
  status: ActivityStatus;
}
const localDateTime = (iso: string) => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
const duration = (minutes: number) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim()
    : `${minutes} min`;
const dateBoundary = (date: string, end = false) =>
  date
    ? new Date(`${date}T${end ? "23:59:59.999" : "00:00:00"}`).toISOString()
    : "";
const initialValues = (entry?: Activity): ActivityFormValues => ({
  ticketId: entry?.ticket.id || "",
  ticketCode: entry?.ticket.code || "",
  ticketTitle: entry?.ticket.title || "",
  activity: entry?.activity || "",
  participantIds: entry?.participants.map((p) => p.id) || [],
  serviceStartedAt: localDateTime(
    entry?.serviceStartedAt || new Date().toISOString(),
  ),
  serviceEndedAt: entry?.serviceEndedAt
    ? localDateTime(entry.serviceEndedAt)
    : "",
  timeSpentMinutes: entry ? String(entry.timeSpentMinutes) : "",
  status: entry?.status || "IN_PROGRESS",
});

export default function ActivityLog() {
  const { user, loading: authLoading } = useAuth();
  const allowed = !!user && user.role !== "USER";
  const canWrite = user?.role === "ADMIN" || user?.role === "SUB_MANAGER";
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<Activity | "new" | null>(null);
  const [editorBusy, setEditorBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const invalidDates = !!(from && to && from > to);
  const list = useApi<Activity[]>(
    allowed && !invalidDates
      ? `/activity-log?${queryString({ page, pageSize: 15, search: debouncedSearch, status, from: dateBoundary(from), to: dateBoundary(to, true), technicianId: mine ? user?.id : undefined })}`
      : null,
  );
  const reset = () => {
    setSearch("");
    setStatus("");
    setFrom("");
    setTo("");
    setMine(false);
    setPage(1);
  };
  if (authLoading) return <Loading />;
  if (!allowed)
    return (
      <Notice>
        No cuentas con los permisos necesarios para consultar la bitácora.
      </Notice>
    );
  return (
    <>
      <PageHead
        eyebrow="SEGUIMIENTO DEL SERVICIO"
        title="Bitácora de actividades"
        description="El trabajo realizado, los participantes y el tiempo dedicado a cada solicitud."
      >
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setEditor("new")}>
            <Icon name="plus" size={18} />
            Registrar actividad
          </button>
        )}
      </PageHead>
      {success && (
        <div className="ops-toast">
          <Notice tone="success">{success}</Notice>
        </div>
      )}
      {!canWrite && (
        <div className="ops-toast">
          <Notice>
            Puedes consultar las actividades de tus áreas de soporte. El
            subencargado o un administrador registra y actualiza la bitácora.
          </Notice>
        </div>
      )}
      <section className="card">
        <div className="section-head">
          <div>
            <h2>Registro de servicio</h2>
            <p className="ops-count">
              {list.meta
                ? `${list.meta.total} actividades encontradas`
                : "Historial del equipo de soporte"}
            </p>
          </div>
          <Icon name="book" />
        </div>
        <div className="ops-filters">
          <Field label="Buscar actividad" id="activity-search">
            <input
              id="activity-search"
              type="search"
              value={search}
              placeholder="Ticket, actividad o reportero"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Estado" id="activity-status">
            <select
              id="activity-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los estados</option>
              <option value="IN_PROGRESS">En proceso</option>
              <option value="COMPLETED">Completado</option>
            </select>
          </Field>
          <Field label="Desde" id="activity-from">
            <input
              id="activity-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field
            label="Hasta"
            id="activity-to"
            error={
              invalidDates
                ? "La fecha final debe ser posterior o igual a la inicial."
                : undefined
            }
          >
            <input
              id="activity-to"
              type="date"
              value={to}
              min={from || undefined}
              aria-invalid={invalidDates}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <button className="btn btn-quiet" onClick={reset}>
            Limpiar filtros
          </button>
          <label className="ops-switch">
            <input
              type="checkbox"
              checked={mine}
              onChange={(e) => {
                setMine(e.target.checked);
                setPage(1);
              }}
            />
            Mis participaciones
          </label>
        </div>
        {!invalidDates &&
          (list.loading ? (
            <Loading label="Consultando bitácora…" />
          ) : list.error ? (
            <ErrorNotice message={list.error} retry={list.reload} />
          ) : !list.data?.length ? (
            <Empty
              icon="book"
              title="No hay actividades para mostrar"
              hint="Las actividades registradas aparecerán aquí. También puedes ajustar los filtros."
            >
              <button className="btn btn-outline" onClick={reset}>
                Limpiar filtros
              </button>
            </Empty>
          ) : (
            <>
              <div className="table-wrap ops-desktop-table">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Ticket / Actividad</th>
                      <th>Participantes</th>
                      <th>Inicio del servicio</th>
                      <th>Tiempo efectivo</th>
                      <th>Estado</th>
                      <th>
                        <span className="sr-only">Consultar actividad</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <button
                            className="ops-table-button"
                            onClick={() => setSelected(entry.id)}
                          >
                            <span className="ticket-code">
                              {entry.ticket.code}
                            </span>
                            <strong>{entry.ticket.title}</strong>
                            <span className="ops-subtle ops-entry-preview">
                              {entry.activity}
                            </span>
                          </button>
                        </td>
                        <td>
                          {entry.participants.map((p) => (
                            <span className="cell-sub" key={p.id}>
                              {p.fullName}
                            </span>
                          ))}
                        </td>
                        <td className="ops-subtle">
                          {formatDate(entry.serviceStartedAt, true)}
                        </td>
                        <td className="ops-time">
                          {duration(entry.timeSpentMinutes)}
                        </td>
                        <td>
                          <Badge value={entry.status} />
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`Consultar actividad de ${entry.ticket.code}`}
                            onClick={() => setSelected(entry.id)}
                          >
                            <Icon name="chevron" size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ops-card-list">
                {list.data.map((entry) => (
                  <article className="ops-card" key={entry.id}>
                    <div className="row-between">
                      <span className="ticket-code">{entry.ticket.code}</span>
                      <Badge value={entry.status} />
                    </div>
                    <button
                      className="ops-table-button"
                      onClick={() => setSelected(entry.id)}
                    >
                      <strong>{entry.ticket.title}</strong>
                      <span className="ops-subtle ops-entry-preview">
                        {entry.activity}
                      </span>
                    </button>
                    <span className="ops-subtle">
                      {entry.participants.map((p) => p.fullName).join(", ")}
                    </span>
                    <div className="row-between">
                      <span className="ops-subtle">
                        {formatDate(entry.serviceStartedAt)}
                      </span>
                      <strong className="ops-subtle">
                        {duration(entry.timeSpentMinutes)}
                      </strong>
                    </div>
                    <button
                      className="btn btn-outline"
                      onClick={() => setSelected(entry.id)}
                    >
                      Ver actividad
                      <Icon name="arrow" size={16} />
                    </button>
                  </article>
                ))}
              </div>
              <Pagination meta={list.meta} onPage={setPage} />
            </>
          ))}
      </section>
      {selected && (
        <ActivityDetail
          key={`${user?.id}:${selected}`}
          id={selected}
          canWrite={canWrite}
          basePath={
            user?.role === "ADMIN" ? "/admin/tickets" : "/soporte/tickets"
          }
          onClose={() => setSelected(null)}
          onEdit={(entry) => {
            setSelected(null);
            setEditor(entry);
          }}
        />
      )}
      {editor && user && (
        <Modal
          title={editor === "new" ? "Registrar actividad" : "Editar actividad"}
          onClose={() => {
            if (!editorBusy) setEditor(null);
          }}
        >
          <ActivityForm
            key={`${user.id}:${editor === "new" ? "new" : editor.id}`}
            userId={user.id}
            entry={editor === "new" ? undefined : editor}
            onCancel={() => setEditor(null)}
            onBusyChange={setEditorBusy}
            onSaved={() => {
              setSuccess(
                editor === "new"
                  ? "La actividad se registró correctamente."
                  : "La actividad se actualizó y el cambio quedó registrado en el historial.",
              );
              setEditor(null);
              setPage(1);
              list.reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}

function ActivityDetail({
  id,
  canWrite,
  basePath,
  onClose,
  onEdit,
}: {
  id: string;
  canWrite: boolean;
  basePath: string;
  onClose: () => void;
  onEdit: (entry: Activity) => void;
}) {
  const detail = useApi<Activity>(`/activity-log/${id}`);
  const [showHistory, setShowHistory] = useState(false);
  const history = useApi<Revision[]>(
    canWrite && showHistory ? `/activity-log/${id}/history` : null,
  );
  return (
    <Modal title="Detalle de la actividad" onClose={onClose}>
      {detail.loading ? (
        <Loading />
      ) : detail.error ? (
        <ErrorNotice message={detail.error} retry={detail.reload} />
      ) : (
        detail.data && (
          <>
            <div className="ops-section">
              <div>
                <Link
                  className="ticket-code"
                  href={`${basePath}/${detail.data.ticket.id}`}
                >
                  {detail.data.ticket.code}
                  <Icon name="arrow" size={13} />
                </Link>
                <h3>{detail.data.ticket.title}</h3>
              </div>
              <Badge value={detail.data.status} />
            </div>
            <dl className="ops-detail">
              <div className="ops-wide">
                <dt>Falla reportada</dt>
                <dd>{detail.data.failure}</dd>
              </div>
              <div className="ops-wide">
                <dt>Actividad realizada</dt>
                <dd className="ops-entry">{detail.data.activity}</dd>
              </div>
              <div className="ops-wide">
                <dt>Participantes</dt>
                <dd>
                  {detail.data.participants.map((p) => p.fullName).join(", ")}
                </dd>
              </div>
              <div>
                <dt>Inicio del servicio</dt>
                <dd>{formatDate(detail.data.serviceStartedAt, true)}</dd>
              </div>
              <div>
                <dt>Fin del servicio</dt>
                <dd>
                  {detail.data.serviceEndedAt
                    ? formatDate(detail.data.serviceEndedAt, true)
                    : "En curso"}
                </dd>
              </div>
              <div>
                <dt>Tiempo efectivo</dt>
                <dd>{duration(detail.data.timeSpentMinutes)}</dd>
              </div>
              <div>
                <dt>Registrado por</dt>
                <dd>{detail.data.createdBy?.fullName || "—"}</dd>
              </div>
              <div>
                <dt>Reportero</dt>
                <dd>{detail.data.reporter?.fullName || "—"}</dd>
              </div>
              <div>
                <dt>Correo de contacto</dt>
                <dd>
                  {detail.data.reporter?.email ? (
                    <a
                      className="ops-link"
                      href={`mailto:${detail.data.reporter.email}`}
                    >
                      {detail.data.reporter.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>Teléfono de contacto</dt>
                <dd>{detail.data.reporter?.phone || "No proporcionado"}</dd>
              </div>
              <div>
                <dt>Fecha de registro</dt>
                <dd>{formatDate(detail.data.createdAt, true)}</dd>
              </div>
            </dl>
            <p className="ops-history-note">
              Los datos del ticket y del reportero reflejan la información al
              momento del registro.
            </p>
            {canWrite && (
              <>
                <div className="ops-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => onEdit(detail.data!)}
                  >
                    <Icon name="edit" size={16} />
                    Editar actividad
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowHistory((v) => !v)}
                  >
                    <Icon name="clock" size={16} />
                    {showHistory
                      ? "Ocultar historial"
                      : "Ver historial de cambios"}
                  </button>
                </div>
                {showHistory && (
                  <>
                    <div className="ops-section">
                      <h3>Historial de cambios</h3>
                    </div>
                    {history.loading ? (
                      <Loading />
                    ) : history.error ? (
                      <ErrorNotice
                        message={history.error}
                        retry={history.reload}
                      />
                    ) : !history.data?.length ? (
                      <Empty
                        icon="clock"
                        title="Sin modificaciones"
                        hint="La actividad conserva la información con la que se registró."
                      />
                    ) : (
                      <div className="ops-history">
                        {history.data.map((revision) => (
                          <RevisionCard
                            key={revision.id}
                            revision={revision}
                            participants={detail.data!.participants}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )
      )}
    </Modal>
  );
}

const revisionLabels: Record<string, string> = {
  activity: "Actividad",
  participantIds: "Participantes",
  serviceStartedAt: "Inicio del servicio",
  serviceEndedAt: "Fin del servicio",
  timeSpentMinutes: "Tiempo efectivo",
  status: "Estado",
};
function RevisionCard({
  revision,
  participants,
}: {
  revision: Revision;
  participants: Participant[];
}) {
  const format = (key: string, value: unknown) => {
    if (value == null || value === "") return "Sin especificar";
    if (key === "status")
      return value === "COMPLETED" ? "Completado" : "En proceso";
    if (key === "timeSpentMinutes") return duration(Number(value));
    if (key === "participantIds" && Array.isArray(value))
      return value
        .map(
          (id) =>
            participants.find((p) => p.id === id)?.fullName ||
            `Participante registrado (${String(id).slice(0, 8)})`,
        )
        .join(", ");
    if (key === "serviceStartedAt" || key === "serviceEndedAt")
      return formatDate(String(value), true);
    return String(value);
  };
  const changed = Object.keys(revision.newData).filter(
    (key) =>
      JSON.stringify(revision.previousData[key]) !==
      JSON.stringify(revision.newData[key]),
  );
  return (
    <article className="ops-revision">
      <header>
        <strong>{revision.changedBy.fullName}</strong>
        <span className="ops-subtle">
          {formatDate(revision.createdAt, true)}
        </span>
      </header>
      <dl>
        {changed.map((key) => (
          <div key={key}>
            <dt>{revisionLabels[key] || key}</dt>
            <dd className="ops-diff-old">
              <strong>Antes: </strong>
              {format(key, revision.previousData[key])}
            </dd>
            <dd className="ops-diff-new">
              <strong>Después: </strong>
              {format(key, revision.newData[key])}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function ActivityForm({
  userId,
  entry,
  onCancel,
  onSaved,
  onBusyChange,
}: {
  userId: string;
  entry?: Activity;
  onCancel: () => void;
  onSaved: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [values, setValues] = useState<ActivityFormValues>(() =>
    initialValues(entry),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [offline, setOffline] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const submitted = useRef(false);
  const baseline = useRef(values);
  const draftKey = `sist:activity-draft:${userId}:${entry?.id || "new"}`;
  useEffect(() => {
    setOffline(!navigator.onLine);
    const online = () => setOffline(false);
    const offlineEvent = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineEvent);
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<ActivityFormValues>;
        if (
          typeof draft.activity === "string" &&
          Array.isArray(draft.participantIds) &&
          draft.participantIds.every((id) => typeof id === "string") &&
          typeof draft.ticketId === "string" &&
          (!entry || draft.ticketId === entry.ticket.id) &&
          (draft.status === "IN_PROGRESS" || draft.status === "COMPLETED")
        ) {
          const base = initialValues(entry);
          const safe = Object.fromEntries(
            Object.keys(base)
              .filter(
                (key) =>
                  typeof draft[key as keyof ActivityFormValues] === "string",
              )
              .map((key) => [key, draft[key as keyof ActivityFormValues]]),
          );
          setValues({
            ...base,
            ...safe,
            participantIds: draft.participantIds,
            status: draft.status,
          });
          setRestored(true);
        }
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineEvent);
    };
  }, [draftKey, entry]);
  useEffect(() => {
    if (!ready || submitted.current) return;
    const persist = () => {
      if (submitted.current) return;
      try {
        if (JSON.stringify(values) === JSON.stringify(baseline.current)) {
          localStorage.removeItem(draftKey);
          return "empty";
        }
        localStorage.setItem(draftKey, JSON.stringify(values));
        return "saved";
      } catch {
        return false;
      }
    };
    const timer = setTimeout(() => {
      const saved = persist();
      setDraftSaved(saved === "saved");
      setStorageError(saved === false);
    }, 250);
    const beforeUnload = () => {
      persist();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", beforeUnload);
      persist();
    };
  }, [values, ready, draftKey]);
  const update = <K extends keyof ActivityFormValues>(
    key: K,
    value: ActivityFormValues[K],
  ) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDraftSaved(false);
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const chooseTicket = (ticket: TicketChoice) => {
    setValues((v) => ({
      ...v,
      ticketId: ticket.id,
      ticketCode: ticket.code,
      ticketTitle: ticket.title,
      participantIds: [],
    }));
    setErrors((e) => ({ ...e, ticketId: "", participantIds: "" }));
  };
  function discardDraft() {
    if (
      !window.confirm(
        "¿Deseas descartar el borrador y restablecer este formulario?",
      )
    )
      return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* Keep the current form usable when storage is unavailable. */
    }
    setValues({
      ...baseline.current,
      participantIds: [...baseline.current.participantIds],
    });
    setRestored(false);
    setErrors({});
    setError("");
    setDraftSaved(false);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const validation: Record<string, string> = {};
    if (!values.ticketId)
      validation.ticketId = "Selecciona un ticket para registrar la actividad.";
    if (!values.activity.trim())
      validation.activity = "Describe la actividad realizada.";
    if (!values.participantIds.length)
      validation.participantIds = "Selecciona al menos un participante.";
    const start = new Date(values.serviceStartedAt);
    const end = values.serviceEndedAt ? new Date(values.serviceEndedAt) : null;
    if (!values.serviceStartedAt || Number.isNaN(start.getTime()))
      validation.serviceStartedAt = "Ingresa una fecha y hora válidas.";
    if (values.status === "COMPLETED" && !end)
      validation.serviceEndedAt = "Indica cuándo finalizó el servicio.";
    if (end && (Number.isNaN(end.getTime()) || end < start))
      validation.serviceEndedAt =
        "El fin debe ser posterior o igual al inicio del servicio.";
    if (
      !Number.isInteger(Number(values.timeSpentMinutes)) ||
      Number(values.timeSpentMinutes) <= 0
    )
      validation.timeSpentMinutes =
        "Ingresa el tiempo efectivo en minutos enteros mayores que cero.";
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setError("");
    if (!navigator.onLine) {
      setOffline(true);
      setError(
        "No hay conexión. Tu información se conserva en este formulario; podrás enviarla cuando regreses a estar en línea.",
      );
      return;
    }
    setBusy(true);
    onBusyChange(true);
    const body = {
      ...(!entry ? { ticketId: values.ticketId } : {}),
      activity: values.activity.trim(),
      participantIds: values.participantIds,
      serviceStartedAt:
        entry && values.serviceStartedAt === baseline.current.serviceStartedAt
          ? entry.serviceStartedAt
          : start.toISOString(),
      serviceEndedAt:
        entry && values.serviceEndedAt === baseline.current.serviceEndedAt
          ? entry.serviceEndedAt
          : end?.toISOString() || null,
      timeSpentMinutes: Number(values.timeSpentMinutes),
      status: values.status,
    };
    try {
      await api(entry ? `/activity-log/${entry.id}` : "/activity-log", {
        method: entry ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      submitted.current = true;
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* The server has already confirmed the write. */
      }
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError)
        setErrors(
          Object.fromEntries(
            Object.entries(e.fields).map(([key, messages]) => [
              key,
              messages.join(" "),
            ]),
          ),
        );
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <form className="ops-form" onSubmit={(e) => void submit(e)} noValidate>
      {offline && (
        <Notice tone="warning">
          Sin conexión. Continúa capturando: tus datos se conservan localmente.
          Envía la actividad después de recuperar la conexión.
        </Notice>
      )}
      {restored && (
        <Notice>
          Se restauró el borrador de esta actividad. Puedes continuar con su
          edición.
          <div className="ops-draft-actions">
            <button
              type="button"
              className="btn btn-quiet btn-small"
              onClick={discardDraft}
            >
              Descartar borrador
            </button>
          </div>
        </Notice>
      )}
      {storageError && (
        <Notice tone="warning">
          El navegador no permite guardar el borrador. Mantén abierto este
          formulario para conservar la captura.
        </Notice>
      )}
      {error && <ErrorNotice message={error} />}
      <fieldset disabled={busy} className="ops-form">
        <div>
          <label className="ops-label">
            Ticket relacionado <span className="required">*</span>
          </label>
          {values.ticketId ? (
            <div className="ops-selected">
              <div>
                <span className="ticket-code">{values.ticketCode}</span>
                <strong>{values.ticketTitle}</strong>
              </div>
              {!entry && (
                <button
                  type="button"
                  className="btn btn-quiet btn-small"
                  onClick={() => {
                    update("ticketId", "");
                    update("participantIds", []);
                  }}
                >
                  Cambiar
                </button>
              )}
            </div>
          ) : (
            <TicketPicker onSelect={chooseTicket} />
          )}{" "}
          {errors.ticketId && (
            <span className="ops-inline-error" role="alert">
              {errors.ticketId}
            </span>
          )}
          <p className="field-hint">
            Se pueden registrar actividades de tickets en proceso o completados.
          </p>
        </div>
        <Field
          label="Actividad realizada"
          id="log-activity"
          required
          error={errors.activity}
        >
          <textarea
            id="log-activity"
            rows={4}
            value={values.activity}
            required
            aria-invalid={!!errors.activity}
            placeholder="Describe el diagnóstico, las acciones realizadas y los resultados."
            onChange={(e) => update("activity", e.target.value)}
          />
        </Field>
        <fieldset>
          <legend>
            Participantes <span className="required">*</span>
          </legend>
          <ActivityParticipants
            key={values.ticketId}
            ticketId={values.ticketId}
            selected={values.participantIds}
            existing={entry?.participants || []}
            onChange={(ids) => update("participantIds", ids)}
          />
          {errors.participantIds && (
            <span className="ops-inline-error" role="alert">
              {errors.participantIds}
            </span>
          )}
        </fieldset>
        <div className="form-grid">
          <Field
            label="Inicio del servicio"
            id="log-start"
            required
            error={errors.serviceStartedAt}
          >
            <input
              id="log-start"
              type="datetime-local"
              value={values.serviceStartedAt}
              required
              aria-invalid={!!errors.serviceStartedAt}
              onChange={(e) => update("serviceStartedAt", e.target.value)}
            />
          </Field>
          <Field
            label="Fin del servicio"
            id="log-end"
            required={values.status === "COMPLETED"}
            error={errors.serviceEndedAt}
          >
            <input
              id="log-end"
              type="datetime-local"
              value={values.serviceEndedAt}
              min={values.serviceStartedAt || undefined}
              required={values.status === "COMPLETED"}
              aria-invalid={!!errors.serviceEndedAt}
              onChange={(e) => update("serviceEndedAt", e.target.value)}
            />
          </Field>
          <Field
            label="Tiempo efectivo (minutos)"
            id="log-minutes"
            required
            error={errors.timeSpentMinutes}
            hint="Tiempo dedicado al trabajo; puede diferir del intervalo entre las fechas."
          >
            <input
              id="log-minutes"
              type="number"
              min="1"
              step="1"
              value={values.timeSpentMinutes}
              placeholder="Ej. 90"
              required
              aria-invalid={!!errors.timeSpentMinutes}
              onChange={(e) => update("timeSpentMinutes", e.target.value)}
            />
          </Field>
          <Field
            label="Estado de la actividad"
            id="log-status"
            required
            error={errors.status}
          >
            <select
              id="log-status"
              value={values.status}
              onChange={(e) =>
                update("status", e.target.value as ActivityStatus)
              }
            >
              <option value="IN_PROGRESS">En proceso</option>
              <option value="COMPLETED">Completado</option>
            </select>
          </Field>
        </div>
        {entry && (
          <p className="ops-note">
            Los cambios se conservarán en un historial de revisiones con tu
            nombre y la fecha de modificación.
          </p>
        )}
        <div className="row-between">
          <span className="ops-subtle" role="status">
            {draftSaved && !storageError
              ? "Borrador guardado en este dispositivo"
              : "Los campos con * son obligatorios"}
          </span>
          {!restored && (
            <button
              type="button"
              className="btn btn-quiet btn-small"
              onClick={discardDraft}
            >
              Restablecer formulario
            </button>
          )}
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy}
            onClick={onCancel}
          >
            Cerrar y conservar borrador
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !ready || offline}
          >
            {busy
              ? "Guardando…"
              : entry
                ? "Guardar cambios"
                : "Registrar actividad"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function ActivityParticipants({
  ticketId,
  selected,
  existing,
  onChange,
}: {
  ticketId: string;
  selected: string[];
  existing: Participant[];
  onChange: (ids: string[]) => void;
}) {
  const candidates = useApi<Participant[]>(
    ticketId ? `/catalog/activity-log-participants?ticketId=${ticketId}` : null,
  );
  const options = [...(candidates.data || [])];
  selected.forEach((id) => {
    if (!options.some((p) => p.id === id))
      options.push(
        existing.find((p) => p.id === id) || {
          id,
          fullName: "Participante previamente seleccionado",
        },
      );
  });
  if (!ticketId)
    return (
      <p className="ops-note">
        Selecciona primero un ticket para consultar a los participantes
        disponibles.
      </p>
    );
  return (
    <>
      {candidates.loading && <Loading label="Consultando participantes…" />}
      {candidates.error && (
        <ErrorNotice message={candidates.error} retry={candidates.reload} />
      )}{" "}
      {!candidates.loading && !candidates.error && !options.length && (
        <Notice>
          No hay participantes activos disponibles. Consulta con administración.
        </Notice>
      )}
      {options.length > 0 && (
        <div className="ops-participants">
          {options.map((person) => (
            <label className="ops-participant" key={person.id}>
              <input
                type="checkbox"
                checked={selected.includes(person.id)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, person.id]
                      : selected.filter((id) => id !== person.id),
                  )
                }
              />
              <span>
                {person.fullName}
                {person.role && (
                  <span className="cell-sub">{roleLabels[person.role]}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </>
  );
}

function TicketPicker({
  onSelect,
}: {
  onSelect: (ticket: TicketChoice) => void;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [status, setStatus] = useState<ActivityStatus>("IN_PROGRESS");
  const [page, setPage] = useState(1);
  const tickets = useApi<TicketChoice[]>(
    `/tickets?${queryString({ page, pageSize: 5, search: debounced, status })}`,
  );
  return (
    <div className="ops-picker">
      <div className="ops-picker-toolbar">
        <input
          type="search"
          value={search}
          placeholder="Buscar por código o título"
          aria-label="Buscar ticket para la actividad"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={status}
          aria-label="Estado del ticket a seleccionar"
          onChange={(e) => {
            setStatus(e.target.value as ActivityStatus);
            setPage(1);
          }}
        >
          <option value="IN_PROGRESS">En proceso</option>
          <option value="COMPLETED">Completados</option>
        </select>
      </div>
      {tickets.loading ? (
        <Loading label="Buscando tickets…" />
      ) : tickets.error ? (
        <ErrorNotice message={tickets.error} retry={tickets.reload} />
      ) : !tickets.data?.length ? (
        <p className="ops-empty-inline">
          No hay tickets que coincidan. Cambia la búsqueda o el estado.
        </p>
      ) : (
        <>
          {tickets.data.map((ticket) => (
            <button
              className="ops-choice"
              type="button"
              key={ticket.id}
              onClick={() => onSelect(ticket)}
            >
              <span>
                <span className="ops-choice-code">{ticket.code}</span>
                <strong>{ticket.title}</strong>
                <span className="ops-subtle">
                  {ticket.category.name} · {ticket.location.building}
                  {ticket.location.room ? ` · ${ticket.location.room}` : ""}
                </span>
              </span>
              <Icon name="plus" size={18} />
            </button>
          ))}
          {tickets.meta && (
            <div className="pagination">
              <span>{tickets.meta.total} tickets</span>
              <div>
                <button
                  type="button"
                  className="btn btn-quiet btn-small"
                  aria-label="Página anterior de tickets"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <Icon name="back" size={16} />
                </button>
                <span>
                  Página {page} de {tickets.meta.totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-quiet btn-small"
                  aria-label="Página siguiente de tickets"
                  disabled={page >= tickets.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
