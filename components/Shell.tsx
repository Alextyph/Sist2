"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import Icon from "./Icon";
import { ErrorNotice, Loading, Notice } from "./ui";
import { errorMessage } from "@/lib/api";
import { roleHome, roleLabels } from "@/lib/types";
type NavItem = { title: string; href: string; icon: string };
export default function Shell({
  role,
  children,
}: {
  role: "usuario" | "soporte" | "admin" | "all";
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const { user, loading, error, refresh, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const allowed =
    user &&
    (role === "all" ||
      (role === "usuario" && user.role === "USER") ||
      (role === "admin" && user.role === "ADMIN") ||
      (role === "soporte" && ["SUPPORT", "SUB_MANAGER"].includes(user.role)));
  useEffect(() => {
    if (!loading && !error && !user) router.replace("/?session=required");
    else if (user && !allowed)
      router.replace(`${roleHome(user.role)}?access=denied`);
  }, [loading, error, user, allowed, router]);
  useEffect(() => {
    setMenu(false);
    setAccessDenied(
      new URLSearchParams(window.location.search).get("access") === "denied",
    );
  }, [path]);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement | null;
    const sidebar = document.getElementById("app-sidebar");
    const controls = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled)",
        ) || [],
      );
    controls()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(false);
      }
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [menu]);
  if (loading)
    return (
      <div className="session-state">
        <img src="/uabc-escudo.png" width="64" height="80" alt="Escudo UABC" />
        <Loading label="Verificando tu sesión…" />
      </div>
    );
  if (error)
    return (
      <div className="session-state">
        <ErrorNotice message={error} retry={() => void refresh()} />
        <Link className="btn btn-outline" href="/">
          Volver al acceso
        </Link>
      </div>
    );
  if (!allowed || !user) return <Loading label="Redirigiendo…" />;
  const home = roleHome(user.role);
  const support = user.role !== "USER";
  const items: NavItem[] = [
    { title: "Inicio", href: home, icon: "home" },
    {
      title: support ? "Tickets de servicio" : "Mis tickets",
      href: `${home}/tickets`,
      icon: "ticket",
    },
  ];
  if (!support)
    items.push({ title: "Crear ticket", href: "/usuario/nuevo", icon: "plus" });
  if (support)
    items.push({
      title: "Bitácora de servicio",
      href: `${home}/bitacora`,
      icon: "book",
    });
  if (["SUB_MANAGER", "ADMIN"].includes(user.role))
    items.push({
      title: "Inventario",
      href: `${home}/inventario`,
      icon: "monitor",
    });
  if (user.role === "ADMIN")
    items.push(
      { title: "Equipo de soporte", href: "/admin/equipo", icon: "users" },
      { title: "Categorías", href: "/admin/categorias", icon: "folder" },
      { title: "Reportes", href: "/admin/reportes", icon: "chart" },
    );
  const secondary: NavItem[] = [
    { title: "Mi perfil", href: "/perfil", icon: "user" },
    { title: "Centro de ayuda", href: "/ayuda", icon: "help" },
  ];
  const current = [...items, ...secondary].find(
    (i) =>
      path === i.href || (i.href !== home && path.startsWith(i.href + "/")),
  );
  const renderNav = (list: NavItem[]) =>
    list.map((i) => (
      <Link
        key={i.href}
        href={i.href}
        title={i.title}
        aria-current={current?.href === i.href ? "page" : undefined}
      >
        <Icon name={i.icon} />
        <span className="nav-text">{i.title}</span>
        {current?.href === i.href && <span className="nav-active-dot" />}
      </Link>
    ));
  return (
    <div className="shell">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <aside
        id="app-sidebar"
        className={`sidebar${menu ? " sidebar-open" : ""}`}
        role={menu ? "dialog" : undefined}
        aria-modal={menu || undefined}
        aria-label="Menú principal"
      >
        <Link className="brand" href={home}>
          <span className="brand-crest">
            <img
              src="/uabc-escudo.png"
              alt="Escudo UABC"
              width="42"
              height="52"
            />
          </span>
          <span className="brand-text">
            <strong>
              SIST<span className="brand-accent">.</span>
            </strong>
            <small>Soporte Técnico · FCQI</small>
          </span>
        </Link>
        <div className="sidebar-label">ESPACIO DE TRABAJO</div>
        <nav className="nav" aria-label="Navegación principal">
          {renderNav(items)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="sidebar-help-icon">
              <Icon name="shield" />
            </span>
            <strong>Comunidad UABC</strong>
            <p>La tecnología al servicio de nuestra facultad.</p>
          </div>
          <nav className="nav nav-secondary" aria-label="Cuenta y ayuda">
            {renderNav(secondary)}
            <button
              onClick={async () => {
                setLeaving(true);
                setLogoutError("");
                try {
                  await logout();
                } catch (e) {
                  setLogoutError(errorMessage(e));
                  setLeaving(false);
                }
              }}
              disabled={leaving}
            >
              <Icon name="logout" />
              <span className="nav-text">
                {leaving ? "Cerrando sesión…" : "Cerrar sesión"}
              </span>
            </button>
          </nav>
          <div className="sidebar-footer">
            UNIVERSIDAD AUTÓNOMA
            <br />
            DE BAJA CALIFORNIA
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace" inert={menu}>
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <button
              className="icon-button menu-button"
              onClick={() => setMenu(!menu)}
              aria-label={menu ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menu}
            >
              <Icon name={menu ? "close" : "filter"} />
            </button>
            <span className="topbar-faculty">FCQI</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{current?.title || "Detalle de ticket"}</strong>
          </div>
          <Link href="/perfil" className="topbar-user">
            <span className="user-label">
              <strong>{user.fullName}</strong>
              <small>{roleLabels[user.role]}</small>
            </span>
            <span className="avatar">
              {user.fullName
                .split(" ")
                .slice(0, 2)
                .map((s) => s[0])
                .join("")}
            </span>
          </Link>
        </header>
        <main id="contenido" className="content" tabIndex={-1}>
          {logoutError && <ErrorNotice message={logoutError} />}
          {accessDenied && (
            <Notice tone="warning">
              Tu cuenta no tiene permisos para acceder a esa sección. Te
              llevamos a tu espacio de trabajo.
            </Notice>
          )}
          {children}
          <footer className="content-footer">
            <span>Sistema Integral de Soporte Técnico</span>
            <span>FCQI · UABC</span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegación móvil" inert={menu}>
        {renderNav(items.slice(0, 3))}
        <button onClick={() => setMenu(!menu)} aria-expanded={menu}>
          <Icon name="settings" />
          <span>Más</span>
        </button>
      </nav>
    </div>
  );
}
