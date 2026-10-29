"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { useAuth } from "@/components/AuthProvider";
import { API_URL } from "@/lib/api";
import { roleHome } from "@/lib/types";
import { ErrorNotice, Notice } from "@/components/ui";
export default function Login() {
  const { user, loading, error, refresh } = useAuth();
  const router = useRouter();
  const [reason, setReason] = useState("");
  useEffect(() => {
    setReason(new URLSearchParams(window.location.search).get("session") || "");
  }, []);
  useEffect(() => {
    if (user) router.replace(roleHome(user.role));
  }, [user, router]);
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-institution">
          <span className="login-crest">
            <img
              src="/uabc-escudo.png"
              width="52"
              height="65"
              alt="Escudo oficial de la UABC"
            />
          </span>
          <div>
            <strong>
              Universidad Autónoma
              <br />
              de Baja California
            </strong>
            <small>Facultad de Ciencias Químicas e Ingeniería</small>
          </div>
        </div>
        <div className="login-story-body">
          <div className="login-kicker">SOPORTE QUE NOS CONECTA</div>
          <h1>
            Tu facultad,
            <br />
            siempre en <span>funcionamiento.</span>
          </h1>
          <p>
            Un solo lugar para reportar incidencias, recibir asistencia y dar
            seguimiento a tus solicitudes de soporte técnico.
          </p>
          <div className="login-features">
            <span>
              <Icon name="ticket" size={14} />
              Solicitudes de servicio
            </span>
            <span>
              <Icon name="clock" size={14} />
              Seguimiento en línea
            </span>
          </div>
        </div>
        <div className="login-story-footer">
          SIST · SISTEMA INTEGRAL DE SOPORTE TÉCNICO
        </div>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <div className="eyebrow">BIENVENIDO A SIST</div>
          <h2>Estamos para ayudarte.</h2>
          <p>
            Accede con tu cuenta institucional para gestionar tus solicitudes de
            soporte.
          </p>
          {reason === "expired" && (
            <div style={{ marginTop: 20 }}>
              <Notice tone="warning">
                Tu sesión terminó. Inicia sesión para continuar.
              </Notice>
            </div>
          )}
          {error && (
            <div style={{ marginTop: 20 }}>
              <ErrorNotice message={error} retry={() => void refresh()} />
            </div>
          )}
          <a
            className="btn google-button"
            href={`${API_URL}/api/v1/auth/google`}
            aria-busy={loading}
          >
            <span className="google-g" aria-hidden="true">
              G
            </span>
            Continuar con Google
            <Icon name="arrow" size={17} />
          </a>
          <div className="login-divider">ACCESO INSTITUCIONAL</div>
          <div className="login-info">
            <Icon name="shield" size={21} />
            <div>
              <strong>Tu cuenta UABC es tu acceso</strong>Utiliza tu correo
              institucional. Si es tu primera visita, te pediremos tu matrícula
              o número de trabajador para completar tu perfil.
            </div>
          </div>
          <p className="login-privacy">
            Tu sesión es personal. Al terminar, cierra sesión para proteger tu
            información, especialmente en equipos compartidos.
          </p>
        </div>
        <footer className="login-panel-footer">
          Facultad de Ciencias Químicas e Ingeniería · UABC
        </footer>
      </section>
    </main>
  );
}
