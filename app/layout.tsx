import "./design.css";
import { AuthProvider } from "@/components/AuthProvider";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: { default: "SIST · Soporte Técnico FCQI", template: "%s · SIST UABC" },
  description:
    "Sistema Integral de Soporte Técnico de la Facultad de Ciencias Químicas e Ingeniería, UABC.",
};
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
