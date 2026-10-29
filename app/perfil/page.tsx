"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, ApiError, errorMessage } from "@/lib/api";
import { areaLabels, roleLabels } from "@/lib/types";
import { Badge, ErrorNotice, Field, Notice, PageHead } from "@/components/ui";
import Icon from "@/components/Icon";
export default function Profile() {
  const { user, refresh } = useAuth();
  const [fullName, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (user) {
      setName(user.fullName);
      setPhone(user.phone || "");
    }
  }, [user]);
  if (!user) return null;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    const errors: Record<string, string[]> = {};
    if (fullName.trim().length < 2)
      errors.fullName = ["Escribe tu nombre completo."];
    if (phone.trim() && phone.trim().length < 7)
      errors.phone = ["El teléfono debe tener al menos 7 caracteres."];
    setFields(errors);
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || null,
        }),
      });
      await refresh();
      setSuccess(true);
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError) setFields(e.fields);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="MI CUENTA"
        title="Mi perfil"
        description="Mantén tus datos de contacto al día para facilitar la atención."
      />
      {success && (
        <Notice tone="success">
          Tu información se actualizó correctamente.
        </Notice>
      )}
      <div className="profile-grid">
        <aside className="card profile-summary">
          <span className="avatar">
            {user.fullName
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")}
          </span>
          <h2>{user.fullName}</h2>
          <p>{user.email}</p>
          <Badge value={roleLabels[user.role]} />
          <div
            style={{
              borderTop: "1px solid var(--line)",
              marginTop: 24,
              paddingTop: 20,
              textAlign: "left",
            }}
          >
            <span className="detail-label">
              Matrícula / Número de trabajador
            </span>
            <strong className="detail-value">{user.institutionalId}</strong>
            {user.supportAreas.length > 0 && (
              <>
                <span className="detail-label" style={{ marginTop: 18 }}>
                  Áreas de soporte
                </span>
                <p style={{ margin: 0 }}>
                  {user.supportAreas.map((a) => areaLabels[a]).join(" · ")}
                </p>
              </>
            )}
            {user.skills.length > 0 && (
              <>
                <span className="detail-label" style={{ marginTop: 18 }}>
                  Habilidades
                </span>
                <p style={{ margin: 0 }}>{user.skills.join(", ")}</p>
              </>
            )}
          </div>
        </aside>
        <section className="card">
          <div className="section-head">
            <div>
              <h2>Información personal</h2>
              <p>Estos datos se utilizarán en tus futuras solicitudes.</p>
            </div>
            <Icon name="user" />
          </div>
          <form onSubmit={submit} noValidate>
            <Field
              id="profile-name"
              label="Nombre completo"
              required
              error={fields.fullName?.[0]}
            >
              <input
                id="profile-name"
                value={fullName}
                maxLength={150}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!fields.fullName}
              />
            </Field>
            <div className="form-grid">
              <Field
                id="profile-email"
                label="Correo institucional"
                hint="Vinculado a tu cuenta Google."
              >
                <input
                  id="profile-email"
                  type="email"
                  value={user.email}
                  disabled
                />
              </Field>
              <Field
                id="profile-phone"
                label="Teléfono de contacto"
                error={fields.phone?.[0]}
                hint="Opcional. Se puede eliminar dejando el campo vacío."
              >
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  maxLength={30}
                  autoComplete="tel"
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={!!fields.phone}
                />
              </Field>
            </div>
            <ErrorNotice message={error} />
            <div className="form-actions">
              <button className="btn btn-primary" disabled={saving}>
                <Icon name="check" size={17} />
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
