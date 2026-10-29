"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ErrorNotice, Loading } from "@/components/ui";
import { roleHome } from "@/lib/types";
export default function Success() {
  const { refresh } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    refresh().then((user) => {
      if (!current) return;
      if (user) router.replace(roleHome(user.role));
      else
        setError(
          "No encontramos una sesión activa. Regresa al acceso e inicia sesión de nuevo.",
        );
    });
    return () => {
      current = false;
    };
  }, [refresh, router]);
  return (
    <main className="session-state">
      <img src="/uabc-escudo.png" width="65" height="80" alt="Escudo UABC" />
      {error ? (
        <>
          <ErrorNotice message={error} />
          <Link href="/" className="btn btn-primary">
            Volver al acceso
          </Link>
        </>
      ) : (
        <Loading label="Preparando tu espacio de trabajo…" />
      )}
    </main>
  );
}
