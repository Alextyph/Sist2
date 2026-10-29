"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import Icon from "./Icon";
import {
  Badge,
  ErrorNotice,
  Field,
  Loading,
  Modal,
  Notice,
  PageHead,
} from "./ui";
import { api, ApiError, errorMessage, queryString } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { Category, Ticket } from "@/lib/types";
const blank = {
  title: "",
  categoryId: "",
  subcategoryId: "",
  building: "",
  room: "",
  description: "",
  contactPhone: "",
  softwareName: "",
  softwareVersion: "",
  downloadUrl: "",
  coordinationApprovalReference: "",
};
type Draft = typeof blank;
export default function NewTicket() {
  const { user } = useAuth();
  return user ? <NewTicketForm key={user.id} /> : null;
}
function NewTicketForm() {
  const { user } = useAuth();
  const catalog = useApi<{ categories: Category[]; maxActiveTickets: number }>(
    user ? "/catalog/ticket-form" : null,
  );
  const [form, setForm] = useState<Draft>(blank);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Ticket | null>(null);
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [storage, setStorage] = useState(true);
  const [online, setOnline] = useState(true);
  const [discard, setDiscard] = useState(false);
  const key = user ? `sist:ticket-draft:${user.id}` : null;
  useEffect(() => {
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const stored = JSON.parse(raw);
        const safe = { ...blank };
        for (const name of Object.keys(blank) as (keyof Draft)[])
          if (typeof stored[name] === "string") safe[name] = stored[name];
        setForm(safe);
        setRestored(Object.values(safe).some(Boolean));
      }
    } catch {
      setStorage(false);
    }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready || !key || created) return;
    const persist = () => {
      try {
        localStorage.setItem(key, JSON.stringify(form));
      } catch {
        setStorage(false);
      }
    };
    persist();
  }, [form, ready, key, created]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const category = catalog.data?.categories.find(
    (c) => c.id === form.categoryId,
  );
  const subcategory = category?.subcategories.find(
    (c) => c.id === form.subcategoryId,
  );
  const priority = subcategory?.priority ?? category?.defaultPriority;
  const words = form.description.trim().split(/\s+/u).filter(Boolean).length;
  const suggestions = useApi<
    { id: string; title: string; description: string }[]
  >(
    category
      ? `/catalog/support-suggestions?${queryString({ categoryId: category.id, subcategoryId: subcategory?.id })}`
      : null,
  );
  const set = (name: keyof Draft, value: string) => {
    setForm((f) => ({
      ...f,
      [name]: value,
      ...(name === "categoryId" ? { subcategoryId: "" } : {}),
    }));
    setFields((f) => ({ ...f, [name]: [] }));
  };
  function input(
    name: keyof Draft,
    options: { placeholder?: string; maxLength?: number; type?: string } = {},
  ) {
    return (
      <input
        id={name}
        value={form[name]}
        onChange={(e) => set(name, e.target.value)}
        aria-invalid={!!fields[name]?.length}
        aria-describedby={fields[name]?.length ? `${name}-error` : undefined}
        {...options}
      />
    );
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError("");
    const errors: Record<string, string[]> = {};
    if (!form.title.trim())
      errors.title = ["Escribe un título para tu solicitud."];
    if (!category) errors.categoryId = ["Selecciona una categoría disponible."];
    if (category?.subcategories.length && !subcategory)
      errors.subcategoryId = ["Selecciona una subcategoría."];
    if (!form.building.trim())
      errors.building = ["Indica el edificio donde se presenta la falla."];
    if (!form.description.trim())
      errors.description = ["Describe brevemente el problema."];
    else if (words > 50)
      errors.description = ["La descripción admite un máximo de 50 palabras."];
    if (
      form.contactPhone.trim() &&
      (!/^[+\d() .-]+$/u.test(form.contactPhone.trim()) ||
        (form.contactPhone.match(/\d/g)?.length || 0) < 7)
    )
      errors.contactPhone = ["Escribe un teléfono con al menos 7 dígitos."];
    if (category?.requiresSoftwareDetails) {
      for (const name of [
        "softwareName",
        "softwareVersion",
        "downloadUrl",
        "coordinationApprovalReference",
      ] as const)
        if (!form[name].trim())
          errors[name] = [
            "Este campo es obligatorio para una instalación de software.",
          ];
      try {
        const url = new URL(form.downloadUrl);
        if (!["http:", "https:"].includes(url.protocol))
          errors.downloadUrl = ["Utiliza una dirección web http o https."];
      } catch {
        errors.downloadUrl = ["Escribe una dirección web válida."];
      }
    }
    if (!priority && category)
      errors.categoryId = [
        "Esta categoría todavía no tiene prioridad configurada. Selecciona otra o contacta al administrador.",
      ];
    setFields(errors);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(),
      );
      return;
    }
    if (!online) {
      setError(
        "Estás sin conexión. Tu borrador se conserva en este dispositivo; podrás enviarlo cuando vuelvas a conectarte.",
      );
      return;
    }
    setSaving(true);
    try {
      const ticket = await api<Ticket>("/tickets", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          categoryId: form.categoryId,
          subcategoryId: subcategory?.id || null,
          building: form.building.trim(),
          room: form.room.trim() || null,
          description: form.description.trim(),
          contactPhone: form.contactPhone.trim() || null,
          inventoryItemId: null,
          ...(category?.requiresSoftwareDetails
            ? {
                software: {
                  name: form.softwareName.trim(),
                  version: form.softwareVersion.trim(),
                  downloadUrl: form.downloadUrl.trim(),
                  coordinationApprovalReference:
                    form.coordinationApprovalReference.trim(),
                },
              }
            : {}),
        }),
      });
      setCreated(ticket);
      if (key)
        try {
          localStorage.removeItem(key);
        } catch {}
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError) {
        const mapped = { ...e.fields };
        const names: Record<string, string> = {
          "software.name": "softwareName",
          "software.version": "softwareVersion",
          "software.downloadUrl": "downloadUrl",
          "software.coordinationApprovalReference":
            "coordinationApprovalReference",
        };
        Object.entries(names).forEach(([from, to]) => {
          if (mapped[from]) mapped[to] = mapped[from];
        });
        setFields(mapped);
      }
    } finally {
      setSaving(false);
    }
  }
  if (created)
    return (
      <>
        <PageHead
          eyebrow="SOLICITUD REGISTRADA"
          title="Tu reporte ya está en camino"
        />
        <section className="card success-screen">
          <span>
            <Icon name="circleCheck" size={45} />
          </span>
          <h2>Ticket creado correctamente</h2>
          <p>Conserva el folio para dar seguimiento a tu solicitud.</p>
          <strong className="ticket-code">{created.code}</strong>
          <Badge value={created.priority} />
          <div className="head-actions">
            <Link
              className="btn btn-primary"
              href={`/usuario/tickets/${created.id}`}
            >
              Ver mi ticket
              <Icon name="arrow" size={17} />
            </Link>
            <Link className="btn btn-outline" href="/usuario/tickets">
              Ir a mis tickets
            </Link>
          </div>
        </section>
      </>
    );
  return (
    <>
      <PageHead
        eyebrow="NUEVA SOLICITUD"
        title="Reportar una incidencia"
        description="Cuéntanos qué sucede. Te ayudaremos a resolverlo."
      >
        <Link href="/usuario/tickets" className="btn btn-outline">
          <Icon name="back" size={17} />
          Mis tickets
        </Link>
      </PageHead>
      {restored && (
        <Notice>
          Recuperamos tu borrador de este dispositivo. Puedes continuar donde lo
          dejaste.
        </Notice>
      )}
      {!online && (
        <Notice tone="warning">
          Estás sin conexión.{" "}
          {storage
            ? "Tus cambios se guardan como borrador en este dispositivo."
            : "Mantén esta pestaña abierta para conservar tus datos."}
        </Notice>
      )}
      {!storage && (
        <Notice tone="warning">
          El navegador no permite guardar el borrador. Mantén abierta esta
          pestaña hasta enviar la solicitud.
        </Notice>
      )}
      <ErrorNotice message={catalog.error} retry={catalog.reload} />
      {catalog.loading ? (
        <Loading label="Cargando categorías de soporte…" />
      ) : (
        catalog.data && (
          <div className="form-layout">
            <form className="card" onSubmit={submit} noValidate>
              <fieldset className="form-section" disabled={saving}>
                <legend>
                  <span className="step-number">1</span>Información de la
                  incidencia
                </legend>
                <Field
                  id="title"
                  label="Título de la solicitud"
                  required
                  error={fields.title?.[0]}
                  hint="Breve y específico: por ejemplo, «El proyector no muestra señal»."
                >
                  {input("title", {
                    placeholder: "¿Qué problema necesitas resolver?",
                    maxLength: 150,
                  })}
                </Field>
                <div className="form-grid">
                  <Field
                    id="categoryId"
                    label="Categoría"
                    required
                    error={fields.categoryId?.[0]}
                  >
                    <select
                      id="categoryId"
                      value={form.categoryId}
                      onChange={(e) => set("categoryId", e.target.value)}
                      aria-invalid={!!fields.categoryId?.length}
                    >
                      <option value="">Selecciona una categoría</option>
                      {catalog.data.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    id="subcategoryId"
                    label="Subcategoría"
                    required={!!category?.subcategories.length}
                    error={fields.subcategoryId?.[0]}
                  >
                    <select
                      id="subcategoryId"
                      value={form.subcategoryId}
                      disabled={!category?.subcategories.length}
                      onChange={(e) => set("subcategoryId", e.target.value)}
                      aria-invalid={!!fields.subcategoryId?.length}
                    >
                      <option value="">
                        {category?.subcategories.length
                          ? "Selecciona una subcategoría"
                          : "No aplica"}
                      </option>
                      {category?.subcategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field
                  id="description"
                  label="Descripción del problema"
                  required
                  error={fields.description?.[0]}
                  hint="Explica qué ocurrió. Evita incluir contraseñas u otra información sensible."
                >
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Describe la falla y cualquier detalle que nos ayude a atenderla…"
                    aria-invalid={!!fields.description?.length}
                  />
                </Field>
                <p
                  className={`word-count${words > 50 ? " over" : ""}`}
                  aria-live="polite"
                >
                  {words} / 50 palabras
                </p>
              </fieldset>
              <fieldset className="form-section" disabled={saving}>
                <legend>
                  <span className="step-number">2</span>Ubicación y contacto
                </legend>
                <div className="form-grid">
                  <Field
                    id="building"
                    label="Edificio"
                    required
                    error={fields.building?.[0]}
                  >
                    {input("building", {
                      placeholder: "Ej. Edificio 6A",
                      maxLength: 120,
                    })}
                  </Field>
                  <Field
                    id="room"
                    label="Aula o laboratorio"
                    error={fields.room?.[0]}
                    hint="Opcional. Incluye el número o nombre del espacio."
                  >
                    {input("room", {
                      placeholder: "Ej. Laboratorio 204",
                      maxLength: 80,
                    })}
                  </Field>
                </div>
                <div className="contact-card">
                  <span className="avatar">{user?.fullName[0]}</span>
                  <div>
                    <strong>{user?.fullName}</strong>
                    <p>{user?.email}</p>
                  </div>
                  <Link
                    className="text-link"
                    style={{ marginLeft: "auto" }}
                    href="/perfil"
                  >
                    Mi perfil
                  </Link>
                </div>
                <Field
                  id="contactPhone"
                  label="Teléfono de contacto"
                  error={fields.contactPhone?.[0]}
                  hint={
                    user?.phone
                      ? `Opcional. Si lo dejas vacío, usaremos el teléfono de tu perfil: ${user.phone}.`
                      : "Opcional. Facilita que el equipo técnico te contacte."
                  }
                >
                  {input("contactPhone", {
                    type: "tel",
                    placeholder: "Ej. 664 123 4567",
                    maxLength: 40,
                  })}
                </Field>
              </fieldset>
              {category?.requiresSoftwareDetails && (
                <fieldset className="form-section" disabled={saving}>
                  <legend>
                    <span className="step-number">3</span>Datos del software
                  </legend>
                  <div className="form-grid">
                    <Field
                      id="softwareName"
                      label="Nombre del software"
                      required
                      error={fields.softwareName?.[0]}
                    >
                      {input("softwareName", { maxLength: 150 })}
                    </Field>
                    <Field
                      id="softwareVersion"
                      label="Versión"
                      required
                      error={fields.softwareVersion?.[0]}
                    >
                      {input("softwareVersion", { maxLength: 80 })}
                    </Field>
                  </div>
                  <Field
                    id="downloadUrl"
                    label="Enlace de descarga"
                    required
                    error={fields.downloadUrl?.[0]}
                  >
                    {input("downloadUrl", {
                      type: "url",
                      placeholder: "https://",
                      maxLength: 2048,
                    })}
                  </Field>
                  <Field
                    id="coordinationApprovalReference"
                    label="Referencia de aprobación de coordinación"
                    required
                    error={fields.coordinationApprovalReference?.[0]}
                    hint="Indica el oficio o referencia que autoriza la instalación."
                  >
                    {input("coordinationApprovalReference", { maxLength: 120 })}
                  </Field>
                </fieldset>
              )}
              <ErrorNotice message={error} />
              <div className="form-actions">
                <span className="caption">* Campos obligatorios</span>
                <button
                  className="btn btn-quiet"
                  type="button"
                  disabled={saving}
                  onClick={() => setDiscard(true)}
                >
                  Descartar
                </button>
                <button
                  className="btn btn-primary"
                  disabled={
                    saving || !online || !catalog.data.categories.length
                  }
                >
                  <Icon name="plus" size={17} />
                  {saving ? "Registrando…" : "Crear ticket"}
                </button>
              </div>
            </form>
            <aside className="form-aside stack">
              <section className="card">
                <div className="section-head">
                  <h3>Antes de enviar</h3>
                  <Icon name="help" size={20} />
                </div>
                <ul className="info-list">
                  <li>
                    <Icon name="pin" size={18} />
                    <div>
                      <strong>Ubicación precisa</strong>Indica dónde ocurre la
                      incidencia para facilitar la atención.
                    </div>
                  </li>
                  <li>
                    <Icon name="ticket" size={18} />
                    <div>
                      <strong>Un reporte por incidencia</strong>Evita duplicar
                      solicitudes de la misma falla y ubicación.
                    </div>
                  </li>
                  <li>
                    <Icon name="clock" size={18} />
                    <div>
                      <strong>Seguimiento desde tu cuenta</strong>Puedes tener
                      hasta {catalog.data.maxActiveTickets} solicitudes activas.
                    </div>
                  </li>
                </ul>
              </section>
              {category && (
                <section className="card">
                  <p className="eyebrow">PRIORIDAD AUTOMÁTICA</p>
                  {priority ? (
                    <>
                      <Badge value={priority} />
                      <p className="caption" style={{ marginTop: 10 }}>
                        Se determina con la categoría y subcategoría
                        seleccionadas.
                      </p>
                    </>
                  ) : (
                    <p className="caption">
                      La prioridad debe ser configurada por el administrador
                      antes de enviar esta solicitud.
                    </p>
                  )}
                </section>
              )}
              {suggestions.data && suggestions.data.length > 0 && (
                <section className="card">
                  <div className="section-head">
                    <h3>Sugerencias de soporte</h3>
                  </div>
                  {suggestions.data.map((s) => (
                    <details key={s.id} className="support-suggestion">
                      <summary>{s.title}</summary>
                      <p className="caption">{s.description}</p>
                    </details>
                  ))}
                </section>
              )}
              <p className="caption">
                {storage
                  ? "Tu borrador se conserva en este dispositivo mientras completas la solicitud."
                  : "El guardado de borradores no está disponible en este navegador."}
              </p>
            </aside>
          </div>
        )
      )}
      {discard && (
        <Modal
          title="¿Descartar este borrador?"
          onClose={() => setDiscard(false)}
        >
          <p className="muted">
            Se eliminarán los datos que has escrito en este formulario.
          </p>
          <div className="modal-actions">
            <button
              className="btn btn-outline"
              onClick={() => setDiscard(false)}
            >
              Seguir editando
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                setForm(blank);
                setFields({});
                setError("");
                setRestored(false);
                if (key)
                  try {
                    localStorage.removeItem(key);
                  } catch {}
                setDiscard(false);
              }}
            >
              Descartar borrador
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
