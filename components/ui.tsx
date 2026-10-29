"use client";
import Link from "next/link";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactElement,
} from "react";
import Icon from "./Icon";
import {
  formatDate,
  priorityLabels,
  statusLabels,
  type PageMeta,
  type Ticket,
} from "@/lib/types";
export function Badge({ value, v }: { value?: string; v?: string }) {
  const key = value || v || "";
  const label =
    statusLabels[key as keyof typeof statusLabels] ||
    priorityLabels[key as keyof typeof priorityLabels] ||
    key;
  return (
    <span className={`badge badge-${key.toLowerCase().replaceAll(" ", "-")}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}
export function PageHead({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {children && <div className="head-actions">{children}</div>}
    </div>
  );
}
export function Stat({
  n,
  label,
  icon = "ticket",
  tone = "green",
  hint,
}: {
  n: string | number;
  label: string;
  icon?: string;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className={`card stat stat-${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className={`icon-box icon-${tone}`}>
          <Icon name={icon} />
        </span>
      </div>
      <strong>{n}</strong>
      {hint && <p className="caption">{hint}</p>}
    </div>
  );
}
export function Empty({
  title = "No hay resultados",
  hint = "Prueba con otros filtros.",
  icon = "ticket",
  children,
}: {
  title?: string;
  hint?: string;
  icon?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      <p>{hint}</p>
      {children}
    </div>
  );
}
export function Loading({
  label = "Cargando información…",
}: {
  label?: string;
}) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}
export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="notice notice-error" role="alert">
      <Icon name="alert" />
      <div>
        <strong>No pudimos completar la solicitud</strong>
        <p>{message}</p>
      </div>
      {retry && (
        <button
          type="button"
          className="btn btn-small btn-danger"
          onClick={retry}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className={`notice notice-${tone}`} role="status">
      <Icon name={tone === "success" ? "circleCheck" : "help"} />
      <div>{children}</div>
    </div>
  );
}
export function Field({
  label,
  id,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  id?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const describedBy =
    [hint && id ? `${id}-hint` : "", error && id ? `${id}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  const control =
    isValidElement(children) &&
    typeof children.type === "string" &&
    ["input", "select", "textarea"].includes(children.type)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          ...(id ? { id } : {}),
          "aria-describedby": describedBy,
          "aria-invalid": !!error,
          "aria-required": !!required,
        })
      : children;
  return (
    <div className={`field${error ? " error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="required"> *</span>}
      </label>
      {control}
      {hint && (
        <span id={id ? `${id}-hint` : undefined} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span
          id={id ? `${id}-error` : undefined}
          className="field-error"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}
export function Pagination({
  meta,
  onPage,
}: {
  meta?: PageMeta;
  onPage: (page: number) => void;
}) {
  if (!meta || !meta.total) return null;
  return (
    <div className="pagination">
      <span>
        {(meta.page - 1) * meta.pageSize + 1}–
        {Math.min(meta.page * meta.pageSize, meta.total)} de {meta.total}{" "}
        registros
      </span>
      <div>
        <button
          type="button"
          className="btn btn-quiet btn-small"
          disabled={meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
          aria-label="Página anterior"
        >
          <Icon name="back" size={16} />
        </button>
        <span>
          Página {meta.page} de {Math.max(1, meta.totalPages)}
        </span>
        <button
          type="button"
          className="btn btn-quiet btn-small"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
          aria-label="Página siguiente"
        >
          <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function TicketTable({
  rows,
  basePath = "/usuario/tickets",
  showAssignee = false,
}: {
  rows: Ticket[];
  basePath?: string;
  showAssignee?: boolean;
}) {
  if (!rows.length)
    return (
      <Empty
        title="No hay tickets para mostrar"
        hint="Tus solicitudes aparecerán aquí. También puedes ajustar los filtros."
      />
    );
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ticket / Solicitud</th>
              <th>Ubicación</th>
              {showAssignee && <th>Responsable</th>}
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>
                <span className="sr-only">Abrir</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link href={`${basePath}/${t.id}`} className="ticket-title">
                    <span className="ticket-code">{t.code}</span>
                    <strong>{t.title}</strong>
                    <span className="caption">{t.category.name}</span>
                  </Link>
                </td>
                <td>
                  <span>{t.location.building}</span>
                  <span className="cell-sub">
                    {t.location.room || "Sin aula especificada"}
                  </span>
                </td>
                {showAssignee && (
                  <td>
                    {t.assignee?.fullName || (
                      <span className="muted">Sin asignar</span>
                    )}
                  </td>
                )}
                <td>
                  <Badge value={t.priority} />
                </td>
                <td>
                  <Badge value={t.status} />
                </td>
                <td className="nowrap muted">{formatDate(t.createdAt)}</td>
                <td>
                  <Link
                    href={`${basePath}/${t.id}`}
                    className="icon-button"
                    aria-label={`Abrir ticket ${t.code}`}
                  >
                    <Icon name="chevron" size={17} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cards-m">
        {rows.map((t) => (
          <Link
            key={t.id}
            className="mobile-ticket"
            href={`${basePath}/${t.id}`}
          >
            <div className="row-between">
              <span className="ticket-code">{t.code}</span>
              <Badge value={t.status} />
            </div>
            <strong>{t.title}</strong>
            <span className="caption">
              {t.category.name} · {t.location.building}
              {t.location.room ? ` · ${t.location.room}` : ""}
            </span>
            <div className="row-between">
              <Badge value={t.priority} />
              <span className="caption">{formatDate(t.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
