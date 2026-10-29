"use client";

import { useMemo, useState, type FormEvent } from "react";
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
} from "./ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import {
  areaLabels,
  priorityLabels,
  type Category,
  type Priority,
  type Subcategory,
  type SupportArea,
} from "@/lib/types";
import "./admin-modules.css";

type Editor =
  | { kind: "category"; category?: Category }
  | { kind: "subcategory"; category: Category; subcategory?: Subcategory };
type Availability = {
  category: Category;
  subcategory?: Subcategory;
  activate: boolean;
};
const areas = Object.entries(areaLabels) as [SupportArea, string][];
const priorities = Object.entries(priorityLabels) as [Priority, string][];

export default function Categories() {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [success, setSuccess] = useState("");
  const result = useApi<Category[]>(
    user?.role === "ADMIN"
      ? `/categories?includeInactive=${includeInactive}`
      : null,
  );
  const categories = useMemo(
    () =>
      (result.data || []).filter((category) => {
        const term = search.trim().toLocaleLowerCase("es");
        return (
          (!area || category.supportArea === area) &&
          (!term ||
            [
              category.name,
              category.code,
              ...category.subcategories.map((subcategory) => subcategory.name),
            ].some((value) => value.toLocaleLowerCase("es").includes(term)))
        );
      }),
    [result.data, search, area],
  );

  if (authLoading) return <Loading />;
  if (user?.role !== "ADMIN")
    return (
      <Notice tone="warning">
        Solo una cuenta administradora puede modificar el catálogo de
        categorías.
      </Notice>
    );

  function saved(message: string) {
    setEditor(null);
    setAvailability(null);
    setSuccess(message);
    result.reload();
  }
  function reset() {
    setSearch("");
    setArea("");
    setIncludeInactive(false);
  }

  return (
    <>
      <PageHead
        eyebrow="Administración"
        title="Categorías de atención"
        description="Define cómo se clasifican las solicitudes y su prioridad inicial."
      >
        <button
          className="btn btn-primary"
          onClick={() => {
            setSuccess("");
            setEditor({ kind: "category" });
          }}
        >
          <Icon name="plus" size={18} />
          Nueva categoría
        </button>
      </PageHead>
      {success && <Notice tone="success">{success}</Notice>}
      <div className="card admin-catalog-toolbar">
        <Field id="category-search" label="Buscar categoría">
          <div className="admin-search">
            <Icon name="search" size={18} />
            <input
              id="category-search"
              type="search"
              placeholder="Nombre de categoría o subcategoría"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Field>
        <Field id="category-area-filter" label="Área de atención">
          <select
            id="category-area-filter"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          >
            <option value="">Todas las áreas</option>
            {areas.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <label className="admin-inline-check">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Mostrar inactivas
        </label>
        <button className="btn btn-quiet" onClick={reset}>
          <Icon name="refresh" size={17} />
          Restablecer
        </button>
      </div>
      <div className="section-head">
        <h2>Catálogo de solicitudes</h2>
        <span className="caption">
          {categories.length}{" "}
          {categories.length === 1 ? "categoría" : "categorías"}
        </span>
      </div>
      {result.loading ? (
        <Loading label="Cargando categorías…" />
      ) : result.error ? (
        <ErrorNotice message={result.error} retry={result.reload} />
      ) : !categories.length ? (
        <div className="card">
          <Empty
            title="No hay categorías que coincidan"
            hint="Prueba con otra búsqueda o agrega una categoría al catálogo."
            icon="folder"
          >
            <button className="btn btn-outline" onClick={reset}>
              Restablecer filtros
            </button>
          </Empty>
        </div>
      ) : (
        <div className="admin-category-list">
          {categories.map((category) => (
            <article
              key={category.id}
              className={`card admin-category-card${category.isActive === false ? " admin-category-inactive" : ""}`}
            >
              <div className="admin-category-heading">
                <span className="admin-category-icon">
                  <Icon
                    name={
                      category.requiresSoftwareDetails ? "settings" : "folder"
                    }
                    size={22}
                  />
                </span>
                <div className="admin-category-title">
                  <h2>{category.name}</h2>
                  <div className="admin-category-meta">
                    <span className="admin-tag">
                      {areaLabels[category.supportArea]}
                    </span>
                    {category.defaultPriority ? (
                      <Badge value={category.defaultPriority} />
                    ) : (
                      <Badge value="Sin prioridad base" />
                    )}
                    {category.isActive === false && <Badge value="Inactiva" />}
                    {category.requiresSoftwareDetails && (
                      <span className="caption">
                        Requiere detalles de software
                      </span>
                    )}
                  </div>
                </div>
                <div className="admin-category-actions">
                  <button
                    className="btn btn-quiet btn-small"
                    aria-label={`Editar categoría ${category.name}`}
                    onClick={() => setEditor({ kind: "category", category })}
                  >
                    <Icon name="edit" size={16} />
                    Editar
                  </button>
                  <button
                    className={`btn btn-small ${category.isActive === false ? "btn-outline" : "btn-quiet"}`}
                    onClick={() =>
                      setAvailability({
                        category,
                        activate: category.isActive === false,
                      })
                    }
                  >
                    {category.isActive === false ? "Reactivar" : "Desactivar"}
                  </button>
                </div>
              </div>
              <div className="admin-subcategories">
                {category.subcategories.length ? (
                  category.subcategories.map((subcategory) => {
                    const effectivePriority =
                      subcategory.priority ?? category.defaultPriority;
                    return (
                      <div
                        key={subcategory.id}
                        className="admin-subcategory-row"
                      >
                        <div>
                          <span>{subcategory.name}</span>
                          {subcategory.isActive === false && (
                            <Badge value="Inactiva" />
                          )}
                          <span className="admin-code">{subcategory.code}</span>
                          <span className="admin-mobile-priority">
                            {effectivePriority ? (
                              <Badge value={effectivePriority} />
                            ) : (
                              <Badge value="Por configurar" />
                            )}
                          </span>
                        </div>
                        <div className="admin-category-actions">
                          <span
                            className="admin-subcategory-priority"
                            title={
                              subcategory.priority
                                ? "Prioridad de la subcategoría"
                                : "Hereda la prioridad de la categoría"
                            }
                          >
                            {effectivePriority ? (
                              <Badge value={effectivePriority} />
                            ) : (
                              <Badge value="Por configurar" />
                            )}
                          </span>
                          <button
                            className="icon-button"
                            aria-label={`Editar subcategoría ${subcategory.name}`}
                            onClick={() =>
                              setEditor({
                                kind: "subcategory",
                                category,
                                subcategory,
                              })
                            }
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            className="btn btn-quiet btn-small"
                            onClick={() =>
                              setAvailability({
                                category,
                                subcategory,
                                activate: subcategory.isActive === false,
                              })
                            }
                            aria-label={`${subcategory.isActive === false ? "Reactivar" : "Desactivar"} subcategoría ${subcategory.name}`}
                          >
                            {subcategory.isActive === false
                              ? "Reactivar"
                              : "Desactivar"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="admin-empty-subcategories">
                    Esta categoría no tiene subcategorías. Se puede seleccionar
                    directamente al crear una solicitud.
                  </p>
                )}
              </div>
              <div className="admin-catalog-bottom">
                <p className="caption">
                  {category.isActive === false
                    ? "Inactiva: no está disponible para nuevas solicitudes."
                    : !category.defaultPriority
                      ? "Configura una prioridad base o una prioridad para cada subcategoría antes de recibir solicitudes."
                      : "Cada solicitud recibe la prioridad de su subcategoría o, en su ausencia, la prioridad base."}
                </p>
                <button
                  className="btn btn-quiet btn-small"
                  disabled={category.isActive === false}
                  onClick={() => setEditor({ kind: "subcategory", category })}
                >
                  <Icon name="plus" size={16} />
                  Subcategoría
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="admin-footnote">
        <Icon name="help" size={17} />
        <p>
          La prioridad se asigna automáticamente al crear un ticket. Las
          categorías desactivadas conservan su historial. Los cambios del
          catálogo se aplican a nuevas solicitudes.
        </p>
      </div>
      {editor && (
        <CatalogEditor
          editor={editor}
          onClose={() => setEditor(null)}
          onSaved={() =>
            saved(
              editor.kind === "category"
                ? editor.category
                  ? "La categoría se actualizó."
                  : "La categoría se agregó al catálogo."
                : editor.subcategory
                  ? "La subcategoría se actualizó."
                  : "La subcategoría se agregó al catálogo.",
            )
          }
        />
      )}
      {availability && (
        <CatalogAvailability
          values={availability}
          onClose={() => setAvailability(null)}
          onSaved={() =>
            saved(
              `${availability.subcategory ? "La subcategoría" : "La categoría"} se ${availability.activate ? "reactivó" : "desactivó"}.`,
            )
          }
        />
      )}
    </>
  );
}

function CatalogEditor({
  editor,
  onClose,
  onSaved,
}: {
  editor: Editor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCategory = editor.kind === "category";
  const existing =
    editor.kind === "category" ? editor.category : editor.subcategory;
  const [name, setName] = useState(existing?.name || "");
  const [code, setCode] = useState(existing?.code || "");
  const [supportArea, setSupportArea] = useState<SupportArea>(
    editor.category?.supportArea || "HARDWARE",
  );
  const [priority, setPriority] = useState<Priority | "">(
    (editor.kind === "category"
      ? editor.category?.defaultPriority
      : editor.subcategory?.priority) || "",
  );
  const [requiresSoftwareDetails, setRequiresSoftwareDetails] = useState(
    editor.kind === "category"
      ? editor.category?.requiresSoftwareDetails || false
      : false,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  const priorityField = isCategory ? "defaultPriority" : "priority";
  const parentPriority =
    editor.kind === "subcategory" ? editor.category.defaultPriority : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure("");
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Escribe un nombre para el catálogo.";
    if (name.trim().length > 150)
      nextErrors.name = "El nombre admite hasta 150 caracteres.";
    if (!existing && !/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/u.test(code.trim()))
      nextErrors.code =
        "Usa letras mayúsculas y números separados por guion bajo, por ejemplo FALLA_MONITOR.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      const common = {
        name: name.trim(),
        ...(!existing ? { code: code.trim() } : {}),
      };
      const body = isCategory
        ? {
            ...common,
            supportArea,
            defaultPriority: priority || null,
            requiresSoftwareDetails,
          }
        : { ...common, priority: priority || null };
      const path =
        editor.kind === "category"
          ? existing
            ? `/categories/${existing.id}`
            : "/categories"
          : existing
            ? `/subcategories/${existing.id}`
            : `/categories/${editor.category.id}/subcategories`;
      await api(path, {
        method: existing ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (error) {
      setFailure(errorMessage(error));
      if (error instanceof ApiError) {
        const fields = Object.fromEntries(
          Object.entries(error.fields).map(([key, messages]) => [
            key,
            messages.join(" "),
          ]),
        );
        if (
          error.code === "CATEGORY_CODE_ALREADY_EXISTS" ||
          error.code === "SUBCATEGORY_CODE_ALREADY_EXISTS"
        )
          fields.code = error.message;
        setErrors(fields);
      }
    } finally {
      setSaving(false);
    }
  }

  const fieldProps = (key: string) => ({
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `catalog-${key}-error` : undefined,
  });
  return (
    <Modal
      title={`${existing ? "Editar" : "Nueva"} ${isCategory ? "categoría" : "subcategoría"}`}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <p className="admin-modal-intro">
        {editor.kind === "subcategory" ? (
          <>
            Categoría: <strong>{editor.category.name}</strong>.{" "}
          </>
        ) : (
          "Configura la clasificación y el área responsable. "
        )}
        Los campos con * son obligatorios.
      </p>
      <form onSubmit={submit} noValidate>
        <Field id="catalog-name" label="Nombre" required error={errors.name}>
          <input
            id="catalog-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
            placeholder={isCategory ? "Falla de equipo" : "Sistema inoperable"}
            {...fieldProps("name")}
          />
        </Field>
        <Field
          id="catalog-code"
          label="Código del catálogo"
          required={!existing}
          error={errors.code}
          hint={
            existing
              ? "El código identifica el registro y no puede modificarse."
              : "Identificador único; usa mayúsculas y guiones bajos."
          }
        >
          <input
            id="catalog-code"
            required={!existing}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            readOnly={!!existing}
            placeholder={isCategory ? "FALLA_EQUIPO" : "SISTEMA_INOPERABLE"}
            {...fieldProps("code")}
          />
        </Field>
        <div className={isCategory ? "form-grid" : undefined}>
          {isCategory && (
            <Field
              id="catalog-supportArea"
              label="Área de atención"
              required
              error={errors.supportArea}
            >
              <select
                id="catalog-supportArea"
                value={supportArea}
                onChange={(e) => setSupportArea(e.target.value as SupportArea)}
                {...fieldProps("supportArea")}
              >
                {areas.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field
            id={`catalog-${priorityField}`}
            label={
              isCategory ? "Prioridad base" : "Prioridad de la subcategoría"
            }
            error={errors[priorityField]}
            hint={
              isCategory
                ? "Se usa cuando la subcategoría no tiene prioridad propia."
                : "Si no eliges una, se usa la prioridad base de la categoría."
            }
          >
            <select
              id={`catalog-${priorityField}`}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority | "")}
              {...fieldProps(priorityField)}
            >
              <option value="">
                {isCategory
                  ? "Sin prioridad configurada"
                  : parentPriority
                    ? `Heredar: ${priorityLabels[parentPriority]}`
                    : "Heredar: sin prioridad base"}
              </option>
              {priorities.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {isCategory && (
          <label className="admin-form-checkbox">
            <input
              type="checkbox"
              checked={requiresSoftwareDetails}
              onChange={(e) => setRequiresSoftwareDetails(e.target.checked)}
            />
            <span>
              <strong>Solicitar detalles de software</strong>
              <small>
                El formulario pedirá nombre, versión, enlace de descarga y
                referencia de aprobación de coordinación.
              </small>
            </span>
          </label>
        )}
        {!priority && (isCategory || !parentPriority) && (
          <Notice tone="warning">
            Una solicitud necesita una prioridad configurada.{" "}
            {isCategory
              ? "Configúrala aquí o en sus subcategorías antes de usar esta categoría."
              : "Esta subcategoría no estará lista para recibir tickets hasta que tenga una prioridad propia o una prioridad base."}
          </Notice>
        )}
        {failure && <ErrorNotice message={failure} />}
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-outline"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving
              ? "Guardando…"
              : existing
                ? "Guardar cambios"
                : `Crear ${isCategory ? "categoría" : "subcategoría"}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CatalogAvailability({
  values,
  onClose,
  onSaved,
}: {
  values: Availability;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const item = values.subcategory || values.category;
  async function confirm() {
    setSaving(true);
    setFailure("");
    try {
      await api(
        `/${values.subcategory ? "subcategories" : "categories"}/${item.id}`,
        {
          method: values.activate ? "PATCH" : "DELETE",
          ...(values.activate
            ? { body: JSON.stringify({ isActive: true }) }
            : {}),
        },
      );
      onSaved();
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={`${values.activate ? "Reactivar" : "Desactivar"} ${values.subcategory ? "subcategoría" : "categoría"}`}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <p className="admin-modal-intro">
        {values.activate ? (
          <>
            ¿Volver a habilitar <strong>{item.name}</strong> para nuevas
            solicitudes?
          </>
        ) : (
          <>
            ¿Desactivar <strong>{item.name}</strong>? Dejará de estar disponible
            para nuevas solicitudes. Los tickets y registros anteriores se
            conservarán.
          </>
        )}
      </p>
      {values.activate &&
        values.subcategory &&
        values.category.isActive === false && (
          <Notice tone="warning">
            La categoría principal está inactiva. También tendrás que
            reactivarla para permitir nuevas solicitudes.
          </Notice>
        )}
      {failure && <ErrorNotice message={failure} />}
      <div className="modal-actions">
        <button className="btn btn-outline" disabled={saving} onClick={onClose}>
          Cancelar
        </button>
        <button
          className={`btn ${values.activate ? "btn-primary" : "btn-danger"}`}
          onClick={confirm}
          disabled={saving}
        >
          {saving
            ? "Guardando…"
            : values.activate
              ? "Sí, reactivar"
              : "Sí, desactivar"}
        </button>
      </div>
    </Modal>
  );
}
