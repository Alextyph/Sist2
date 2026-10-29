"use client";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import Icon from "@/components/Icon";
import { Notice, PageHead } from "@/components/ui";
import { roleHome } from "@/lib/types";
export default function Help() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <PageHead
        eyebrow="TE ORIENTAMOS"
        title="Centro de ayuda"
        description="Todo lo que necesitas para solicitar y dar seguimiento al soporte técnico."
      />
      <div className="help-grid">
        <section className="card">
          <div className="section-head">
            <h2>Solicitudes de soporte</h2>
            <Icon name="ticket" />
          </div>
          <details open>
            <summary>¿Cómo reporto una incidencia?</summary>
            <p>
              Desde «Crear ticket», escribe un título y una descripción de hasta
              50 palabras. Selecciona la categoría y, si corresponde, la
              subcategoría. Indica el edificio y, de forma opcional, el aula y
              un teléfono de contacto.
            </p>
          </details>
          <details>
            <summary>¿Cómo se determina la prioridad?</summary>
            <p>
              La prioridad se asigna automáticamente según el catálogo de
              categorías. El administrador puede ajustarla con una
              justificación.
            </p>
          </details>
          <details>
            <summary>¿Cómo consulto el avance?</summary>
            <p>
              Abre un ticket desde el listado. El detalle muestra su estado, el
              responsable y la cronología de cambios.
            </p>
          </details>
          <details>
            <summary>¿Puedo crear más de un ticket?</summary>
            <p>
              Puedes tener hasta diez solicitudes activas. Si ya existe una
              incidencia activa de la misma categoría y ubicación, el sistema
              evita duplicar el reporte.
            </p>
          </details>
          <Link
            href={`${roleHome(user.role)}/tickets`}
            className="text-link"
            style={{ marginTop: 20 }}
          >
            Consultar mis tickets
            <Icon name="arrow" size={15} />
          </Link>
        </section>
        <section className="card">
          <div className="section-head">
            <h2>Tu cuenta y tus datos</h2>
            <Icon name="shield" />
          </div>
          <details open>
            <summary>¿Qué cuenta debo usar?</summary>
            <p>
              Inicia sesión con tu cuenta Google institucional autorizada. En tu
              primera visita, completa tu matrícula o número de trabajador.
            </p>
          </details>
          <details>
            <summary>¿Qué pasa si pierdo la conexión?</summary>
            <p>
              Los formularios de ticket y bitácora conservan un borrador en este
              navegador cuando el almacenamiento está disponible. Al volver,
              podrás continuar y enviarlo manualmente. Evita dejar borradores en
              equipos compartidos.
            </p>
          </details>
          <details>
            <summary>¿Puedo cambiar mis datos?</summary>
            <p>
              En «Mi perfil» puedes actualizar tu nombre y teléfono. El correo y
              tu identificador institucional se conservan vinculados a tu
              cuenta.
            </p>
          </details>
          <details>
            <summary>¿Por qué no veo todas las opciones?</summary>
            <p>
              Las herramientas dependen de tu rol y área de soporte. El
              administrador gestiona las altas y áreas del equipo técnico.
            </p>
          </details>
          <Link href="/perfil" className="text-link" style={{ marginTop: 20 }}>
            Revisar mi perfil
            <Icon name="arrow" size={15} />
          </Link>
        </section>
      </div>
      <div style={{ marginTop: 24 }}>
        <Notice>
          Utiliza el sistema para incidencias y solicitudes relacionadas con los
          servicios de la facultad. Nunca incluyas contraseñas en tus reportes.
        </Notice>
      </div>
    </>
  );
}
