import Link from "next/link";
export default function NotFound() {
  return (
    <main className="session-state">
      <div className="eyebrow">ERROR 404</div>
      <h1>No encontramos esta página</h1>
      <p className="muted">
        Revisa la dirección o regresa al inicio del sistema.
      </p>
      <Link className="btn btn-primary" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
