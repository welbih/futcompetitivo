import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import AppShell from "./components/app-shell";

export const metadata: Metadata = {
  title: "Futebol Competitivo | Crie seu campeonato",
  description: "Reúna jogadores de PES e FIFA, crie seu campeonato de futebol virtual e transforme a rivalidade entre amigos em competição.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body><Suspense fallback={<p role="status" className="resource-page">Carregando…</p>}><AppShell>{children}</AppShell></Suspense></body>
    </html>
  );
}





