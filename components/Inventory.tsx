"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError, errorMessage, queryString } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/hooks";
import { formatDate, type TicketStatus } from "@/lib/types";
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

type InventoryType = "COMPUTER" | "PROJECTOR" | "CONTROL" | "ADAPTER";
const typeLabels: Record<InventoryType, string> = {
  COMPUTER: "Computadora",
  PROJECTOR: "Proyector",
  CONTROL: "Control",
  ADAPTER: "Adaptador",
};
interface Item {
  id: string;
  type: InventoryType;
  model: string;
  assetCode: string | null;
  color: string | null;
  size: string | null;
  serialNumber: string | null;
  quantity: number;
  isActive: boolean;
  updatedAt: string;
  location?: { building: string | null; room: string | null };
  building?: string | null;
  room?: string | null;
  notes?: string | null;
  createdAt?: string;
}
interface ItemTicket {
  id: string;
  code: string;
  title: string;
  status: TicketStatus;
  priority: string;
  category: { name: string };
  reporter: { fullName: string };
  createdAt: string;
  completedAt: string | null;
}
type FormValues = {
  type: InventoryType;
  model: string;
  assetCode: string;
  color: string;
  size: string;
  building: string;
  room: string;
  serialNumber: string;
  quantity: string;
  notes: string;
};
const blank: FormValues = {
  type: "COMPUTER",
  model: "",
  assetCode: "",
  color: "",
  size: "",
  building: "",
  room: "",
  serialNumber: "",
  quantity: "1",
  notes: "",
};
const dateBoundary = (date: string, end = false) =>
  date
    ? new Date(`${date}T${end ? "23:59:59.999" : "00:00:00"}`).toISOString()
    : "";

export default function Inventory() {
  const { user, loading: authLoading } = useAuth();
  const allowed = user?.role === "ADMIN" || user?.role === "SUB_MANAGER";
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [type, setType] = useState("");
  const [building, setBuilding] = useState("");
  const debouncedBuilding = useDebounced(building);
  const [active, setActive] = useState("true");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<Item | "new" | null>(null);
  const [editorBusy, setEditorBusy] = useState(false);
  const [deactivate, setDeactivate] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const list = useApi<Item[]>(
    allowed
      ? `/inventory?${queryString({ page, pageSize: 15, search: debouncedSearch, type, building: debouncedBuilding, active })}`
      : null,
  );
  const reset = () => {
    setSearch("");
    setType("");
    setBuilding("");
    setActive("true");
    setPage(1);
  };
  const changed = (message: string) => {
    setEditor(null);
    setSuccess(message);
    setPage(1);
    list.reload();
  };
  async function remove() {
    if (!deactivate || busy) return;
    setBusy(true);
    setActionError("");
    try {
      await api(`/inventory/${deactivate.id}`, { method: "DELETE" });
      setDeactivate(null);
      setSuccess(
        "El artículo se desactivó. Su información e historial se conservaron.",
      );
      setPage(1);
      list.reload();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (authLoading) return <Loading />;
  if (!allowed)
    return (
      <Notice>
        No cuentas con los permisos necesarios para consultar el inventario.
      </Notice>
    );
  return (
    <>
      <PageHead
        eyebrow="GESTIÓN DE RECURSOS"
        title="Inventario"
        description="Cada equipo, su ubicación y su historial de soporte en un solo lugar."
      >
        <button className="btn btn-primary" onClick={() => setEditor("new")}>
          <Icon name="plus" size={18} />
          Registrar artículo
        </button>
      </PageHead>
      {success && (
        <div className="ops-toast">
          <Notice tone="success">{success}</Notice>
        </div>
      )}
      <section className="card">
        <div className="section-head">
          <div>
            <h2>Equipos y accesorios</h2>
            <p className="ops-count">
              {list.meta
                ? `${list.meta.total} ${active === "true" ? "artículos activos" : "artículos inactivos"}`
                : "Inventario institucional"}
            </p>
          </div>
          <Icon name="monitor" />
        </div>
        <div className="ops-filters">
          <Field label="Buscar artículo" id="inventory-search">
            <input
              id="inventory-search"
              type="search"
              value={search}
              placeholder="Modelo, patrimonio o número de serie"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Tipo" id="inventory-type">
            <select
              id="inventory-type"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los tipos</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Edificio" id="inventory-building">
            <input
              id="inventory-building"
              value={building}
              placeholder="Todos los edificios"
              onChange={(e) => {
                setBuilding(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Disponibilidad" id="inventory-active">
            <select
              id="inventory-active"
              value={active}
              onChange={(e) => {
                setActive(e.target.value);
                setPage(1);
              }}
            >
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </Field>
          <button className="btn btn-quiet" onClick={reset}>
            Limpiar filtros
          </button>
        </div>
        {list.loading ? (
          <Loading label="Consultando inventario…" />
        ) : list.error ? (
          <ErrorNotice message={list.error} retry={list.reload} />
        ) : !list.data?.length ? (
          <Empty
            icon="monitor"
            title="No hay artículos para mostrar"
            hint="Prueba otros filtros o registra un artículo en el inventario."
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
                    <th>Equipo / artículo</th>
                    <th>Tipo</th>
                    <th>Ubicación</th>
                    <th>N.º de serie</th>
                    <th>Cantidad</th>
                    <th>Estado</th>
                    <th>
                      <span className="sr-only">Consultar</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          className="ops-table-button"
                          onClick={() => setSelected(item.id)}
                        >
                          <strong>{item.model}</strong>
                          <span className="ops-subtle">
                            {item.assetCode || "Sin código patrimonial"}
                          </span>
                        </button>
                      </td>
                      <td>{typeLabels[item.type]}</td>
                      <td>
                        {item.location?.building || "Sin ubicación"}
                        <span className="cell-sub">
                          {item.location?.room || "Sin aula"}
                        </span>
                      </td>
                      <td className="ops-subtle">{item.serialNumber || "—"}</td>
                      <td>{item.quantity}</td>
                      <td>
                        <span
                          className={`ops-state-label ${!item.isActive ? "ops-state-inactive" : ""}`}
                        >
                          {item.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          onClick={() => setSelected(item.id)}
                          aria-label={`Consultar ${item.model}`}
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
              {list.data.map((item) => (
                <article className="ops-card" key={item.id}>
                  <div className="row-between">
                    <span className="ops-subtle">{typeLabels[item.type]}</span>
                    <span
                      className={`ops-state-label ${!item.isActive ? "ops-state-inactive" : ""}`}
                    >
                      {item.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <button
                    className="ops-table-button"
                    onClick={() => setSelected(item.id)}
                  >
                    <strong>{item.model}</strong>
                    <span className="ops-subtle">
                      {item.assetCode || "Sin código patrimonial"}
                    </span>
                  </button>
                  <div className="row-between">
                    <span className="ops-subtle">
                      {item.location?.building || "Sin ubicación"}{" "}
                      {item.location?.room || ""}
                    </span>
                    <span className="ops-subtle">
                      Cantidad: {item.quantity}
                    </span>
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={() => setSelected(item.id)}
                  >
                    Ver artículo e historial
                    <Icon name="arrow" size={16} />
                  </button>
                </article>
              ))}
            </div>
            <Pagination meta={list.meta} onPage={setPage} />
          </>
        )}
      </section>
      {selected && (
        <InventoryDetail
          key={selected}
          id={selected}
          basePath={
            user?.role === "ADMIN" ? "/admin/tickets" : "/soporte/tickets"
          }
          onClose={() => setSelected(null)}
          onEdit={(item) => {
            setSelected(null);
            setEditor(item);
          }}
          onDeactivate={(item) => {
            setSelected(null);
            setActionError("");
            setDeactivate(item);
          }}
        />
      )}
      {editor && (
        <Modal
          title={editor === "new" ? "Registrar artículo" : "Editar artículo"}
          onClose={() => {
            if (!editorBusy) setEditor(null);
          }}
        >
          <InventoryForm
            key={editor === "new" ? "new" : editor.id}
            item={editor === "new" ? undefined : editor}
            onCancel={() => setEditor(null)}
            onSaved={changed}
            onBusyChange={setEditorBusy}
          />
        </Modal>
      )}
      {deactivate && (
        <Modal
          title="Desactivar artículo"
          onClose={() => {
            if (!busy) setDeactivate(null);
          }}
        >
          <p>
            ¿Deseas desactivar <strong>{deactivate.model}</strong>? Dejará de
            estar disponible para nuevas solicitudes. Su información y el
            historial de incidencias se conservarán.
          </p>
          {actionError && <ErrorNotice message={actionError} />}
          <div className="modal-actions">
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => setDeactivate(null)}
            >
              Cancelar
            </button>
            <button
              className="btn btn-danger"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "Desactivando…" : "Desactivar artículo"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function InventoryDetail({
  id,
  basePath,
  onClose,
  onEdit,
  onDeactivate,
}: {
  id: string;
  basePath: string;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onDeactivate: (item: Item) => void;
}) {
  const detail = useApi<Item>(`/inventory/${id}`);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalidDates = !!(from && to && from > to);
  const history = useApi<ItemTicket[]>(
    invalidDates
      ? null
      : `/inventory/${id}/tickets?${queryString({ page, pageSize: 10, status, from: dateBoundary(from), to: dateBoundary(to, true) })}`,
  );
  return (
    <Modal title="Detalle del artículo" onClose={onClose}>
      {detail.loading ? (
        <Loading />
      ) : detail.error ? (
        <ErrorNotice message={detail.error} retry={detail.reload} />
      ) : (
        detail.data && (
          <>
            <div className="ops-section">
              <div>
                <span className="eyebrow">{typeLabels[detail.data.type]}</span>
                <h3>{detail.data.model}</h3>
              </div>
              <span
                className={`ops-state-label ${!detail.data.isActive ? "ops-state-inactive" : ""}`}
              >
                {detail.data.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
            <dl className="ops-detail">
              <div>
                <dt>Código patrimonial</dt>
                <dd>{detail.data.assetCode || "—"}</dd>
              </div>
              <div>
                <dt>Número de serie</dt>
                <dd>{detail.data.serialNumber || "—"}</dd>
              </div>
              <div>
                <dt>Edificio</dt>
                <dd>{detail.data.building || "Sin especificar"}</dd>
              </div>
              <div>
                <dt>Aula / laboratorio</dt>
                <dd>{detail.data.room || "Sin especificar"}</dd>
              </div>
              <div>
                <dt>Color</dt>
                <dd>{detail.data.color || "—"}</dd>
              </div>
              <div>
                <dt>Tamaño / formato</dt>
                <dd>{detail.data.size || "—"}</dd>
              </div>
              <div>
                <dt>Cantidad</dt>
                <dd>{detail.data.quantity}</dd>
              </div>
              <div>
                <dt>Última actualización</dt>
                <dd>{formatDate(detail.data.updatedAt, true)}</dd>
              </div>
              {detail.data.notes && (
                <div className="ops-wide">
                  <dt>Observaciones</dt>
                  <dd className="ops-entry">{detail.data.notes}</dd>
                </div>
              )}
            </dl>
            <div className="ops-actions">
              <button
                className="btn btn-outline"
                onClick={() => onEdit(detail.data!)}
              >
                <Icon name="edit" size={16} />
                Editar artículo
              </button>
              {detail.data.isActive && (
                <button
                  className="btn btn-danger"
                  onClick={() => onDeactivate(detail.data!)}
                >
                  Desactivar
                </button>
              )}
            </div>
            <div className="ops-section">
              <h3>Historial de incidencias</h3>
              <span className="ops-count">
                {history.meta?.total ?? 0} registros
              </span>
            </div>
            <div className="form-grid">
              <Field label="Estado del ticket" id="item-history-status">
                <select
                  id="item-history-status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todos los estados</option>
                  <option value="OPEN">Abierto</option>
                  <option value="IN_REVIEW">En revisión</option>
                  <option value="IN_PROGRESS">En proceso</option>
                  <option value="COMPLETED">Completado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </Field>
              <Field label="Desde" id="item-history-from">
                <input
                  id="item-history-from"
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
                id="item-history-to"
                error={
                  invalidDates
                    ? "La fecha final debe ser posterior o igual a la inicial."
                    : undefined
                }
              >
                <input
                  id="item-history-to"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                />
              </Field>
            </div>
            {!invalidDates &&
              (history.loading ? (
                <Loading />
              ) : history.error ? (
                <ErrorNotice message={history.error} retry={history.reload} />
              ) : !history.data?.length ? (
                <Empty
                  icon="book"
                  title="Sin incidencias registradas"
                  hint="Los tickets vinculados a este artículo aparecerán aquí."
                />
              ) : (
                <>
                  <div className="ops-history">
                    {history.data.map((ticket) => (
                      <Link
                        className="mobile-ticket"
                        href={`${basePath}/${ticket.id}`}
                        key={ticket.id}
                      >
                        <div className="row-between">
                          <span className="ticket-code">{ticket.code}</span>
                          <Badge value={ticket.status} />
                        </div>
                        <strong>{ticket.title}</strong>
                        <span className="ops-subtle">
                          {ticket.category.name} · {ticket.reporter.fullName}
                        </span>
                        <div className="row-between">
                          <Badge value={ticket.priority} />
                          <span className="ops-subtle">
                            {formatDate(ticket.createdAt)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Pagination meta={history.meta} onPage={setPage} />
                </>
              ))}
          </>
        )
      )}
    </Modal>
  );
}

function InventoryForm({
  item,
  onCancel,
  onSaved,
  onBusyChange,
}: {
  item?: Item;
  onCancel: () => void;
  onSaved: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [values, setValues] = useState<FormValues>(
    item
      ? {
          type: item.type,
          model: item.model || "",
          assetCode: item.assetCode || "",
          color: item.color || "",
          size: item.size || "",
          building: item.building || "",
          room: item.room || "",
          serialNumber: item.serialNumber || "",
          quantity: String(item.quantity),
          notes: item.notes || "",
        }
      : blank,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const single = values.type === "COMPUTER" || values.type === "PROJECTOR";
  const update = (key: keyof FormValues, value: string) => {
    setValues((v) => ({
      ...v,
      [key]: value,
      ...(key === "type" ? { quantity: "1" } : {}),
    }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const required = (key: keyof FormValues) =>
    key === "model" ||
    key === "quantity" ||
    (single && ["assetCode", "color", "size"].includes(key)) ||
    (values.type === "COMPUTER" && ["building", "serialNumber"].includes(key));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const validation: Record<string, string> = {};
    (
      [
        "model",
        "assetCode",
        "color",
        "size",
        "building",
        "serialNumber",
      ] as const
    ).forEach((key) => {
      if (required(key) && !values[key].trim())
        validation[key] =
          "Este campo es obligatorio para el tipo seleccionado.";
    });
    if (
      !Number.isInteger(Number(values.quantity)) ||
      Number(values.quantity) < 1
    )
      validation.quantity = "Ingresa una cantidad entera mayor o igual a 1.";
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    onBusyChange(true);
    setError("");
    const body = {
      ...(!item ? { type: values.type } : {}),
      model: values.model.trim(),
      assetCode: values.assetCode.trim() || null,
      color: values.color.trim() || null,
      size: values.size.trim() || null,
      building: values.building.trim() || null,
      room: values.room.trim() || null,
      serialNumber: values.serialNumber.trim() || null,
      quantity: single ? 1 : Number(values.quantity),
      notes: values.notes.trim() || null,
    };
    try {
      await api(item ? `/inventory/${item.id}` : "/inventory", {
        method: item ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      onSaved(
        item
          ? "Los cambios del artículo se guardaron correctamente."
          : "El artículo se registró correctamente en el inventario.",
      );
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError) {
        setErrors(
          Object.fromEntries(
            Object.entries(e.fields).map(([key, messages]) => [
              key,
              messages.join(" "),
            ]),
          ),
        );
        if (e.code === "INVENTORY_ASSET_CODE_ALREADY_EXISTS")
          setErrors((v) => ({
            ...v,
            assetCode: "Este código patrimonial ya está registrado.",
          }));
        if (e.code === "INVENTORY_SERIAL_NUMBER_ALREADY_EXISTS")
          setErrors((v) => ({
            ...v,
            serialNumber: "Este número de serie ya está registrado.",
          }));
      }
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  const fields: Array<[keyof FormValues, string, string]> = [
    ["model", "Modelo / nombre", "Ej. Dell OptiPlex 7090"],
    ["assetCode", "Código patrimonial", "Identificador institucional"],
    ["serialNumber", "Número de serie", "Número de serie del fabricante"],
    ["color", "Color", "Ej. Negro"],
    ["size", "Tamaño / formato", "Ej. SFF, 24 pulgadas"],
    ["building", "Edificio", "Ej. Edificio 6"],
    ["room", "Aula / laboratorio", "Ej. Laboratorio 603"],
  ];
  return (
    <form className="ops-form" onSubmit={(e) => void submit(e)} noValidate>
      {error && <ErrorNotice message={error} />}
      <p className="ops-note">
        Los campos marcados con * son obligatorios según el tipo de artículo.
      </p>
      <div className="form-grid">
        <Field label="Tipo de artículo" id="item-type" required>
          <select
            id="item-type"
            value={values.type}
            disabled={!!item || busy}
            onChange={(e) => update("type", e.target.value)}
          >
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Cantidad"
          id="item-quantity"
          required
          error={errors.quantity}
          hint={
            single
              ? "Las computadoras y proyectores se registran individualmente."
              : undefined
          }
        >
          <input
            id="item-quantity"
            type="number"
            min="1"
            step="1"
            value={single ? "1" : values.quantity}
            readOnly={single}
            aria-invalid={!!errors.quantity}
            onChange={(e) => update("quantity", e.target.value)}
          />
        </Field>
        {fields.map(([key, label, placeholder]) => (
          <Field
            key={key}
            label={label}
            id={`item-${key}`}
            required={required(key)}
            error={errors[key]}
          >
            <input
              id={`item-${key}`}
              value={values[key]}
              placeholder={placeholder}
              required={required(key)}
              aria-invalid={!!errors[key]}
              onChange={(e) => update(key, e.target.value)}
            />
          </Field>
        ))}
        <div className="ops-wide">
          <Field label="Observaciones" id="item-notes" error={errors.notes}>
            <textarea
              id="item-notes"
              value={values.notes}
              placeholder="Información adicional del artículo"
              onChange={(e) => update("notes", e.target.value)}
            />
          </Field>
        </div>
      </div>
      <div className="modal-actions">
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy
            ? "Guardando…"
            : item
              ? "Guardar cambios"
              : "Registrar artículo"}
        </button>
      </div>
    </form>
  );
}
