"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, ApiError, errorMessage } from "@/lib/api";
import { roleHome, type User } from "@/lib/types";
import { ErrorNotice, Field } from "@/components/ui";
import Icon from "@/components/Icon";
export default function CompleteProfile() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [institutionalId, setId] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFields({});
    setError("");
    const next: Record<string, string[]> = {};
    if (!institutionalId.trim())
      next.institutionalId = ["Escribe tu matrícula o número de trabajador."];
    if (phone.trim() && phone.trim().length < 7)
      next.phone = ["Escribe al menos 7 caracteres."];
    if (Object.keys(next).length) {
      setFields(next);
      return;
    }
    setSaving(true);
    try {
      const user = await api<User>("/auth/complete-profile", {
        method: "POST",
        body: JSON.stringify({
          institutionalId: institutionalId.trim(),
          phone: phone.trim() || null,
        }),
      });
      await refresh();
      router.replace(roleHome(user.role));
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError) setFields(e.fields);
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="session-state">
      <div className="onboarding card">
        <Link className="back-link" href="/">
          <Icon name="back" size={16} />
          Volver al acceso
        </Link>
        <div className="eyebrow">UN PASO MÁS</div>
        <h1>Completa tu perfil</h1>
        <p className="page-description" style={{ marginBottom: 24 }}>
          Confirma tu identificador institucional para empezar a utilizar SIST.
          Tu nombre y correo provienen de tu cuenta Google.
        </p>
        <form onSubmit={submit} noValidate>
          <Field
            id="institutionalId"
            label="Matrícula o número de trabajador"
            required
            error={fields.institutionalId?.[0]}
          >
            <input
              autoFocus
              id="institutionalId"
              value={institutionalId}
              maxLength={50}
              autoComplete="username"
              onChange={(e) => setId(e.target.value)}
              aria-invalid={!!fields.institutionalId}
            />
          </Field>
          <Field
            id="phone"
            label="Teléfono de contacto"
            hint="Opcional. Nos ayuda a contactarte para resolver una incidencia."
            error={fields.phone?.[0]}
          >
            <input
              id="phone"
              type="tel"
              value={phone}
              maxLength={30}
              autoComplete="tel"
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!fields.phone}
            />
          </Field>
          <ErrorNotice message={error} />
          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={saving}
          >
            {saving ? "Guardando perfil…" : "Comenzar"}
            <Icon name="arrow" size={17} />
          </button>
        </form>
      </div>
    </main>
  );
}
