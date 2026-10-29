"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
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
  roleLabels,
  type SupportArea,
} from "@/lib/types";
import "./admin-modules.css";

type SupportRole = "SUPPORT" | "SUB_MANAGER";
export interface SupportMember {
  id: string;
  fullName: string;
  email: string;
  institutionalId: string;
  role: SupportRole;
  supportAreas: SupportArea[];
  skills: string[];
  isActive: boolean;
  googleLinked: boolean;
  lastLoginAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

type DialogState =
  | { kind: "create" }
  | { kind: "view" | "edit" | "deactivate" | "activate"; member: SupportMember }
  | null;
const areas = Object.entries(areaLabels) as [SupportArea, string][];

export default function SupportMembers() {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [area, setArea] = useState("");
  const [active, setActive] = useState("true");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [success, setSuccess] = useState("");
  const debouncedSearch = useDebounced(search.trim());
  const result = useApi<SupportMember[]>(
    user?.role === "ADMIN"
      ? `/support-members?${queryString({ search: debouncedSearch, role, supportArea: area, active, page, pageSize: 12 })}`
      : null,
  );

  if (authLoading) return <Loading />;
  if (user?.role !== "ADMIN")
    return (
      <Notice tone="warning">
        Solo una cuenta administradora puede gestionar el equipo de soporte.
      </Notice>
    );

  function resetFilters() {
    setSearch("");
    setRole("");
    setArea("");
    setActive("true");
    setPage(1);
  }
  function saved(message: string) {
    setDialog(null);
    setSuccess(message);
    result.reload();
  }

  return (
    <>
      <PageHead
        eyebrow="Administración"
        title="Equipo de soporte"
        description="Organiza a las personas que mantienen en marcha la facultad."
      >
        <button
          className="btn btn-primary"
          onClick={() => {
            setSuccess("");
            setDialog({ kind: "create" });
          }}
        >
          <Icon name="plus" size={18} />
          Agregar miembro
        </button>
      </PageHead>
      {success && <Notice tone="success">{success}</Notice>}
      <div className="card admin-list-card">
        <div className="section-head">
          <div>
            <h2>Miembros del equipo</h2>
            <p className="caption">
              Consulta perfiles, áreas de atención y permisos.
            </p>
          </div>
          <span className="admin-total">
            {result.meta
              ? `${result.meta.total} ${active === "true" ? "activos" : "inactivos"}`
              : "Equipo FCQI"}
          </span>
        </div>
        <div className="filters admin-filters">
          <Field id="member-search" label="Buscar miembro">
            <div className="admin-search">
              <Icon name="search" size={18} />
              <input
                id="member-search"
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Nombre, correo o matrícula"
              />
            </div>
          </Field>
          <Field id="member-role" label="Rol">
            <select
              id="member-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los roles</option>
              <option value="SUPPORT">Soporte técnico</option>
              <option value="SUB_MANAGER">Subencargado</option>
            </select>
          </Field>
          <Field id="member-area" label="Área">
            <select
              id="member-area"
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas las áreas</option>
              {areas.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="member-active" label="Disponibilidad">
            <select
              id="member-active"
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
          <button className="btn btn-quiet" onClick={resetFilters}>
            <Icon name="refresh" size={17} />
            Restablecer
          </button>
        </div>
        {result.loading ? (
          <Loading label="Cargando equipo de soporte…" />
        ) : result.error ? (
          <ErrorNotice message={result.error} retry={result.reload} />
        ) : !result.data?.length ? (
          <Empty
            icon="users"
            title="No hay miembros que coincidan"
            hint="Ajusta los filtros o agrega una persona al equipo."
          >
            <button className="btn btn-outline" onClick={resetFilters}>
              Restablecer filtros
            </button>
          </Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Miembro</th>
                    <th>Rol</th>
                    <th>Áreas de atención</th>
                    <th>Acceso con Google</th>
                    <th>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <button
                          className="admin-person-button"
                          onClick={() => setDialog({ kind: "view", member })}
                        >
                          <span className="admin-avatar">
                            {initials(member.fullName)}
                          </span>
                          <span>
                            <strong>{member.fullName}</strong>
                            <span className="cell-sub">{member.email}</span>
                          </span>
                        </button>
                      </td>
                      <td>
                        <Badge value={roleLabels[member.role]} />
                      </td>
                      <td>
                        <div className="admin-tags">
                          {member.supportAreas.map((value) => (
                            <span key={value} className="admin-tag">
                              {areaLabels[value]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span
                          className={
                            member.googleLinked ? "admin-linked" : "muted"
                          }
                        >
                          {member.googleLinked
                            ? "Vinculado"
                            : "Primer acceso pendiente"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-quiet btn-small"
                          onClick={() => setDialog({ kind: "view", member })}
                          aria-label={`Ver perfil de ${member.fullName}`}
                        >
                          Ver perfil
                          <Icon name="chevron" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cards-m">
              {result.data.map((member) => (
                <button
                  key={member.id}
                  className="mobile-ticket admin-mobile-member"
                  onClick={() => setDialog({ kind: "view", member })}
                >
                  <div className="row-between">
                    <span className="admin-avatar">
                      {initials(member.fullName)}
                    </span>
                    <Badge value={roleLabels[member.role]} />
                  </div>
                  <strong>{member.fullName}</strong>
                  <span className="caption">{member.email}</span>
                  <span className="admin-tags">
                    {member.supportAreas.map((value) => (
                      <span key={value} className="admin-tag">
                        {areaLabels[value]}
                      </span>
                    ))}
                  </span>
                  <span className="admin-mobile-action">
                    Ver perfil <Icon name="arrow" size={16} />
                  </span>
                </button>
              ))}
            </div>
            <Pagination meta={result.meta} onPage={setPage} />
          </>
        )}
      </div>
      <div className="admin-footnote">
        <Icon name="shield" size={17} />
        <p>
          Las personas acceden con su correo institucional. El rol y las áreas
          determinan sus funciones y los tickets que pueden atender.
        </p>
      </div>
      {dialog?.kind === "create" && (
        <MemberEditor
          onClose={() => setDialog(null)}
          onSaved={() =>
            saved(
              "El miembro se agregó al equipo. Ya puede ingresar con su correo institucional.",
            )
          }
        />
      )}
      {dialog?.kind === "edit" && (
        <MemberEditor
          member={dialog.member}
          onClose={() => setDialog(null)}
          onSaved={() =>
            saved("Los datos y permisos del miembro se actualizaron.")
          }
        />
      )}
      {dialog?.kind === "view" && (
        <MemberDetail
          memberId={dialog.member.id}
          onClose={() => setDialog(null)}
          onAction={(kind, member) => setDialog({ kind, member })}
        />
      )}
      {(dialog?.kind === "activate" || dialog?.kind === "deactivate") && (
        <MemberAvailability
          member={dialog.member}
          activate={dialog.kind === "activate"}
          onClose={() => setDialog(null)}
          onSaved={() =>
            saved(
              dialog.kind === "activate"
                ? "El miembro se reactivó. Puede volver a iniciar sesión."
                : "El miembro se desactivó. Su historial se conserva.",
            )
          }
        />
      )}
    </>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function MemberDetail({
  memberId,
  onClose,
  onAction,
}: {
  memberId: string;
  onClose: () => void;
  onAction: (
    action: "edit" | "deactivate" | "activate",
    member: SupportMember,
  ) => void;
}) {
  const result = useApi<SupportMember>(`/support-members/${memberId}`);
  const member = result.data;
  return (
    <Modal title="Perfil del miembro" onClose={onClose}>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice message={result.error} retry={result.reload} />
      ) : (
        member && (
          <>
            <div className="admin-profile-head">
              <span className="admin-avatar admin-avatar-large">
                {initials(member.fullName)}
              </span>
              <div>
                <h3>{member.fullName}</h3>
                <p className="muted">{roleLabels[member.role]}</p>
              </div>
              <Badge value={member.isActive ? "Activo" : "Inactivo"} />
            </div>
            <dl className="admin-details">
              <div>
                <dt>Correo institucional</dt>
                <dd>
                  <a href={`mailto:${member.email}`}>{member.email}</a>
                </dd>
              </div>
              <div>
                <dt>Matrícula o número de trabajador</dt>
                <dd>{member.institutionalId}</dd>
              </div>
              <div>
                <dt>Áreas de atención</dt>
                <dd className="admin-tags">
                  {member.supportAreas.length
                    ? member.supportAreas.map((value) => (
                        <span key={value} className="admin-tag">
                          {areaLabels[value]}
                        </span>
                      ))
                    : "Sin áreas asignadas"}
                </dd>
              </div>
              <div>
                <dt>Habilidades</dt>
                <dd>
                  {member.skills.length
                    ? member.skills.join(" · ")
                    : "Sin habilidades registradas"}
                </dd>
              </div>
              <div>
                <dt>Acceso con Google</dt>
                <dd>
                  {member.googleLinked
                    ? "Cuenta vinculada"
                    : "Primer acceso pendiente"}
                </dd>
              </div>
              <div>
                <dt>Último acceso</dt>
                <dd>{formatDate(member.lastLoginAt, true)}</dd>
              </div>
              <div>
                <dt>Miembro desde</dt>
                <dd>{formatDate(member.createdAt)}</dd>
              </div>
            </dl>
            {!member.googleLinked && (
              <Notice>
                La persona debe iniciar sesión con el correo{" "}
                <strong>{member.email}</strong>. Su cuenta de Google se
                vinculará al ingresar por primera vez.
              </Notice>
            )}
            <div className="modal-actions">
              <button
                className={`btn ${member.isActive ? "btn-danger" : "btn-outline"}`}
                onClick={() =>
                  onAction(member.isActive ? "deactivate" : "activate", member)
                }
              >
                {member.isActive ? "Desactivar miembro" : "Reactivar miembro"}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onAction("edit", member)}
              >
                <Icon name="edit" size={17} />
                Editar perfil
              </button>
            </div>
          </>
        )
      )}
    </Modal>
  );
}

function MemberEditor({
  member,
  onClose,
  onSaved,
}: {
  member?: SupportMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(member?.fullName || "");
  const [email, setEmail] = useState(member?.email || "");
  const [institutionalId, setInstitutionalId] = useState(
    member?.institutionalId || "",
  );
  const [role, setRole] = useState<SupportRole>(member?.role || "SUPPORT");
  const [supportAreas, setSupportAreas] = useState<SupportArea[]>(
    member?.supportAreas || [],
  );
  const [skills, setSkills] = useState(member?.skills.join(", ") || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure("");
    const nextErrors: Record<string, string> = {};
    const skillList = skills
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!fullName.trim()) nextErrors.fullName = "Escribe el nombre completo.";
    if (fullName.trim().length > 150)
      nextErrors.fullName = "El nombre admite hasta 150 caracteres.";
    if (!member && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim()))
      nextErrors.email = "Escribe un correo institucional válido.";
    if (!member && !institutionalId.trim())
      nextErrors.institutionalId =
        "Escribe la matrícula o el número de trabajador.";
    if ((!member || member.isActive) && !supportAreas.length)
      nextErrors.supportAreas = "Selecciona al menos un área de atención.";
    if (skillList.length > 50 || skillList.some((value) => value.length > 100))
      nextErrors.skills =
        "Registra hasta 50 habilidades, de máximo 100 caracteres cada una.";
    if (
      new Set(skillList.map((value) => value.toLocaleLowerCase("es"))).size !==
      skillList.length
    )
      nextErrors.skills = "Cada habilidad debe aparecer una sola vez.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      const values = {
        fullName: fullName.trim(),
        role,
        supportAreas,
        skills: skillList,
      };
      await api(member ? `/support-members/${member.id}` : "/support-members", {
        method: member ? "PATCH" : "POST",
        body: JSON.stringify(
          member
            ? values
            : {
                ...values,
                email: email.trim().toLowerCase(),
                institutionalId: institutionalId.trim(),
              },
        ),
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
          error.code === "EMAIL_ALREADY_REGISTERED" ||
          error.code === "EMAIL_DOMAIN_NOT_ALLOWED"
        )
          fields.email = error.message;
        if (error.code === "INSTITUTIONAL_ID_ALREADY_REGISTERED")
          fields.institutionalId = error.message;
        setErrors(fields);
      }
    } finally {
      setSaving(false);
    }
  }

  const fieldProps = (name: string) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `edit-member-${name}-error` : undefined,
  });
  return (
    <Modal
      title={member ? "Editar miembro" : "Agregar miembro"}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <p className="admin-modal-intro">
        {member
          ? "Actualiza sus datos y los permisos para atender solicitudes."
          : "Registra su correo institucional y configura sus funciones en el equipo."}{" "}
        Los campos con * son obligatorios.
      </p>
      <form onSubmit={submit} noValidate>
        <Field
          id="edit-member-fullName"
          label="Nombre completo"
          required
          error={errors.fullName}
        >
          <input
            id="edit-member-fullName"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={150}
            autoComplete="name"
            {...fieldProps("fullName")}
          />
        </Field>
        <div className="form-grid">
          <Field
            id="edit-member-email"
            label="Correo institucional"
            required
            error={errors.email}
            hint={
              member
                ? "La identidad institucional no se puede cambiar."
                : undefined
            }
          >
            <input
              id="edit-member-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@uabc.edu.mx"
              readOnly={!!member}
              autoComplete="email"
              {...fieldProps("email")}
            />
          </Field>
          <Field
            id="edit-member-institutionalId"
            label="Matrícula o número de trabajador"
            required
            error={errors.institutionalId}
          >
            <input
              id="edit-member-institutionalId"
              required
              value={institutionalId}
              onChange={(e) => setInstitutionalId(e.target.value)}
              maxLength={100}
              readOnly={!!member}
              {...fieldProps("institutionalId")}
            />
          </Field>
        </div>
        <fieldset className="admin-checklist">
          <legend>
            Rol <span className="required">*</span>
          </legend>
          <p className="field-hint">
            Selecciona las funciones que tendrá dentro del equipo.
          </p>
          <label className="admin-check-option">
            <input
              type="radio"
              name="support-role"
              value="SUPPORT"
              checked={role === "SUPPORT"}
              onChange={() => setRole("SUPPORT")}
            />
            <span>
              <strong>Soporte técnico</strong>
              <small>
                Consulta tickets de sus áreas, se asigna solicitudes y registra
                avances de atención.
              </small>
            </span>
          </label>
          <label className="admin-check-option">
            <input
              type="radio"
              name="support-role"
              value="SUB_MANAGER"
              checked={role === "SUB_MANAGER"}
              onChange={() => setRole("SUB_MANAGER")}
            />
            <span>
              <strong>Subencargado</strong>
              <small>
                Incluye funciones de soporte, edición de bitácora y gestión de
                inventario.
              </small>
            </span>
          </label>
        </fieldset>
        <fieldset
          className={`admin-checklist${errors.supportAreas ? " error" : ""}`}
          aria-describedby={
            errors.supportAreas ? "edit-member-supportAreas-error" : undefined
          }
        >
          <legend>
            Áreas de atención{" "}
            {(!member || member.isActive) && (
              <span className="required">*</span>
            )}
          </legend>
          <div className="admin-area-checks">
            {areas.map(([value, label]) => (
              <label key={value} className="admin-check-option">
                <input
                  type="checkbox"
                  checked={supportAreas.includes(value)}
                  onChange={(e) =>
                    setSupportAreas((current) =>
                      e.target.checked
                        ? [...current, value]
                        : current.filter((item) => item !== value),
                    )
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {errors.supportAreas && (
            <p
              id="edit-member-supportAreas-error"
              className="field-error"
              role="alert"
            >
              {errors.supportAreas}
            </p>
          )}
        </fieldset>
        <Field
          id="edit-member-skills"
          label="Habilidades"
          hint="Separa con comas; por ejemplo: proyectores, diagnóstico de equipos."
          error={errors.skills}
        >
          <textarea
            id="edit-member-skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            rows={2}
            {...fieldProps("skills")}
          />
        </Field>
        {failure && <ErrorNotice message={failure} />}
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving
              ? "Guardando…"
              : member
                ? "Guardar cambios"
                : "Agregar miembro"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MemberAvailability({
  member,
  activate,
  onClose,
  onSaved,
}: {
  member: SupportMember;
  activate: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const [hasActiveTickets, setHasActiveTickets] = useState(false);
  async function confirm() {
    setSaving(true);
    setFailure("");
    setHasActiveTickets(false);
    try {
      await api(`/support-members/${member.id}`, {
        method: activate ? "PATCH" : "DELETE",
        ...(activate ? { body: JSON.stringify({ isActive: true }) } : {}),
      });
      onSaved();
    } catch (error) {
      setFailure(errorMessage(error));
      setHasActiveTickets(
        error instanceof ApiError &&
          error.code === "SUPPORT_MEMBER_HAS_ACTIVE_TICKETS",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={activate ? "Reactivar miembro" : "Desactivar miembro"}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <p className="admin-modal-intro">
        {activate ? (
          <>
            ¿Permitir que <strong>{member.fullName}</strong> vuelva a ingresar
            al sistema con los roles y áreas de su perfil?
          </>
        ) : (
          <>
            ¿Desactivar a <strong>{member.fullName}</strong>? Perderá el acceso
            al sistema. Su identidad e historial de atención se conservarán.
          </>
        )}
      </p>
      {!activate && (
        <Notice tone="warning">
          Antes de desactivar, es necesario reasignar o retirar todos sus
          tickets activos.
        </Notice>
      )}
      {failure && <ErrorNotice message={failure} />}
      {hasActiveTickets && (
        <p className="admin-modal-intro">
          <Link
            href={`/admin/tickets?assignedTo=${member.id}`}
            onClick={onClose}
          >
            Consultar tickets asignados <Icon name="arrow" size={15} />
          </Link>
        </p>
      )}
      <div className="modal-actions">
        <button className="btn btn-outline" disabled={saving} onClick={onClose}>
          Cancelar
        </button>
        <button
          className={`btn ${activate ? "btn-primary" : "btn-danger"}`}
          disabled={saving}
          onClick={confirm}
        >
          {saving
            ? "Guardando…"
            : activate
              ? "Sí, reactivar miembro"
              : "Sí, desactivar miembro"}
        </button>
      </div>
    </Modal>
  );
}
