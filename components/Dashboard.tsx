"use client";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useApi } from "@/lib/hooks";
import {
  areaLabels,
  roleHome,
  type SupportArea,
  type Ticket,
} from "@/lib/types";
import { Empty, ErrorNotice, Loading, PageHead, Stat, TicketTable } from "./ui";
import Icon from "./Icon";
interface DashboardData {
  stats: Record<string, number>;
  recentTickets?: Ticket[];
  priorityTickets?: Ticket[];
  technicianWorkload?: {
    userId: string;
    name: string;
    supportAreas: SupportArea[];
    activeTickets: number;
    completedToday: number;
  }[];
}
export default function Dashboard() {
  const { user } = useAuth();
  const result = useApi<DashboardData>(user ? "/dashboard" : null);
  if (!user) return null;
  const home = roleHome(user.role);
  const ordinary = user.role === "USER";
  const admin = user.role === "ADMIN";
  const definitions = ordinary
    ? [
        {
          key: "active",
          label: "Solicitudes activas",
          icon: "ticket",
          tone: "green",
          hint: "Pendientes de resolución",
        },
        {
          key: "inProgress",
          label: "En proceso",
          icon: "clock",
          tone: "blue",
          hint: "Estamos trabajando en ellas",
        },
        {
          key: "completed",
          label: "Completadas",
          icon: "circleCheck",
          tone: "ochre",
          hint: "Solicitudes resueltas",
        },
      ]
    : admin
      ? [
          {
            key: "activeTickets",
            label: "Tickets activos",
            icon: "ticket",
            tone: "green",
            hint: "En toda la facultad",
          },
          {
            key: "unassigned",
            label: "Sin asignar",
            icon: "clock",
            tone: "ochre",
            hint: "Pendientes de responsable",
          },
          {
            key: "activeTechnicians",
            label: "Técnicos activos",
            icon: "users",
            tone: "blue",
            hint: "Equipo de soporte",
          },
          {
            key: "inventoryItems",
            label: "Artículos activos",
            icon: "monitor",
            tone: "green",
            hint: "Registrados en inventario",
          },
        ]
      : [
          {
            key: "unassigned",
            label: "Sin asignar",
            icon: "ticket",
            tone: "ochre",
            hint: "En tus áreas de soporte",
          },
          {
            key: "mine",
            label: "Mis tickets activos",
            icon: "user",
            tone: "green",
            hint: "Asignados a tu cuenta",
          },
          {
            key: "highPriority",
            label: "Prioridad alta",
            icon: "alert",
            tone: "red",
            hint: "Requieren atención",
          },
          {
            key: "completedToday",
            label: "Completados hoy",
            icon: "circleCheck",
            tone: "blue",
            hint: "Día institucional",
          },
        ];
  return (
    <>
      <PageHead
        eyebrow={
          admin
            ? "ADMINISTRACIÓN"
            : ordinary
              ? "MI ESPACIO"
              : "CENTRO DE SOPORTE"
        }
        title={
          ordinary
            ? `Hola, ${user.fullName.split(" ")[0]}`
            : admin
              ? "Vista general"
              : "Panel de soporte"
        }
        description={
          ordinary
            ? "Así van tus solicitudes de soporte técnico."
            : admin
              ? "Una mirada al servicio y a los recursos de nuestra facultad."
              : "Organiza la atención de las incidencias en tus áreas."
        }
      >
        {ordinary ? (
          <Link className="btn btn-primary" href="/usuario/nuevo">
            <Icon name="plus" size={18} />
            Crear ticket
          </Link>
        ) : (
          <button className="btn btn-outline" onClick={result.reload}>
            <Icon name="refresh" size={17} />
            Actualizar
          </button>
        )}
      </PageHead>
      {ordinary && (
        <div className="welcome">
          <div>
            <p className="eyebrow">TE ACOMPAÑAMOS</p>
            <h2>Una solución comienza con tu reporte.</h2>
            <p>
              Cuéntanos qué sucede y dónde. Nuestro equipo se encargará de dar
              seguimiento a tu solicitud.
            </p>
          </div>
          <div className="welcome-decoration">
            <Icon name="monitor" size={40} />
          </div>
        </div>
      )}
      <ErrorNotice message={result.error} retry={result.reload} />
      {result.loading ? (
        <Loading />
      ) : (
        result.data && (
          <>
            <div className={`grid ${ordinary ? "g3" : "g4"} dashboard-stats`}>
              {definitions.map((s) => (
                <Stat
                  key={s.key}
                  n={result.data!.stats[s.key] ?? 0}
                  label={s.label}
                  icon={s.icon}
                  tone={s.tone}
                  hint={s.hint}
                />
              ))}
            </div>
            {admin ? (
              <div className="dashboard-grid">
                <section className="card">
                  <div className="section-head">
                    <div>
                      <h2>Carga del equipo</h2>
                      <p>Asignación actual y resoluciones del día.</p>
                    </div>
                    <Link className="text-link" href="/admin/equipo">
                      Ver equipo
                      <Icon name="arrow" size={15} />
                    </Link>
                  </div>
                  {!result.data.technicianWorkload?.length ? (
                    <Empty
                      icon="users"
                      title="Aún no hay técnicos activos"
                      hint="Registra al equipo de soporte para comenzar."
                    />
                  ) : (
                    result.data.technicianWorkload.map((t) => (
                      <div className="workload-row" key={t.userId}>
                        <span className="avatar">
                          {t.name
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        <div>
                          <strong>{t.name}</strong>
                          <small>
                            {t.supportAreas
                              .map((a) => areaLabels[a])
                              .join(" · ")}
                          </small>
                        </div>
                        <div className="workload-track" aria-hidden="true">
                          <span
                            style={{
                              width: `${Math.min(100, (t.activeTickets / Math.max(1, ...result.data!.technicianWorkload!.map((w) => w.activeTickets))) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="workload-count">
                          {t.activeTickets} activos
                          <small style={{ display: "block" }}>
                            {t.completedToday} hoy
                          </small>
                        </span>
                      </div>
                    ))
                  )}
                </section>
                <DashboardLinks home={home} admin />
              </div>
            ) : (
              <section className="card card-flush">
                <div className="section-head">
                  <div>
                    <h2>
                      {ordinary
                        ? "Tus solicitudes recientes"
                        : "Incidencias prioritarias"}
                    </h2>
                    <p>
                      {ordinary
                        ? "Consulta sus detalles y sigue cada avance."
                        : "Tickets activos ordenados para su atención."}
                    </p>
                  </div>
                  <Link className="text-link" href={`${home}/tickets`}>
                    Ver todos
                    <Icon name="arrow" size={15} />
                  </Link>
                </div>
                <TicketTable
                  rows={
                    ordinary
                      ? result.data.recentTickets || []
                      : result.data.priorityTickets || []
                  }
                  basePath={`${home}/tickets`}
                  showAssignee={!ordinary}
                />
              </section>
            )}
            {!admin && (
              <div className="dashboard-grid">
                <section className="card">
                  <div className="section-head">
                    <h3>
                      {ordinary ? "¿Cómo funciona?" : "Atención organizada"}
                    </h3>
                    <Icon name="help" size={20} />
                  </div>
                  <ol className="info-list">
                    {(ordinary
                      ? [
                          [
                            "Reporta la incidencia",
                            "Describe la falla y su ubicación. La prioridad se asigna según la categoría.",
                          ],
                          [
                            "Sigue su progreso",
                            "Consulta el estado y el historial de tu ticket en cualquier momento.",
                          ],
                          [
                            "Recibe atención",
                            "El equipo técnico te contactará cuando necesite más información.",
                          ],
                        ]
                      : [
                          [
                            "Selecciona una incidencia",
                            "Consulta los detalles y autoasigna un ticket disponible de tus áreas.",
                          ],
                          [
                            "Registra el avance",
                            "Actualiza los estados de tus tickets conforme avanza el trabajo.",
                          ],
                          [
                            "Completa la atención",
                            "Confirma la resolución y conserva la trazabilidad del servicio.",
                          ],
                        ]
                    ).map(([title, text], i) => (
                      <li key={title}>
                        <span className="number">{i + 1}</span>
                        <div>
                          <strong>{title}</strong>
                          {text}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
                <DashboardLinks home={home} admin={false} />
              </div>
            )}
          </>
        )
      )}
    </>
  );
}
function DashboardLinks({ home, admin }: { home: string; admin: boolean }) {
  return (
    <aside className="card">
      <div className="section-head">
        <h3>Accesos rápidos</h3>
      </div>
      {(admin
        ? [
            [
              "Tickets de servicio",
              "Consulta y asigna incidencias",
              "ticket",
              `${home}/tickets`,
            ],
            [
              "Inventario",
              "Equipos e historial de fallas",
              "monitor",
              `${home}/inventario`,
            ],
            [
              "Reportes de actividad",
              "Indicadores del servicio",
              "chart",
              `${home}/reportes`,
            ],
          ]
        : [
            [
              "Mis datos de contacto",
              "Mantén tu información actualizada",
              "user",
              "/perfil",
            ],
            [
              "Centro de ayuda",
              "Orientación para usar el sistema",
              "help",
              "/ayuda",
            ],
          ]
      ).map(([title, hint, icon, href]) => (
        <Link className="quick-link" key={href} href={href}>
          <span className="icon-box">
            <Icon name={icon} size={18} />
          </span>
          <span>
            <strong>{title}</strong>
            <small>{hint}</small>
          </span>
          <Icon name="chevron" size={15} />
        </Link>
      ))}
    </aside>
  );
}
