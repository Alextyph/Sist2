"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="session-state" role="alert">
      <h1>No pudimos abrir esta vista</h1>
      <p className="muted">Vuelve a intentarlo para cargar la información.</p>
      <button className="btn btn-primary" onClick={reset}>
        Reintentar
      </button>
      <Link href="/" className="text-link">
        Volver al inicio
      </Link>
    </div>
  );
}
