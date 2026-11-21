import type { Metadata } from "next";
import { Suspense } from "react";
import LiveStandings from "./live-standings";

export const metadata: Metadata = { title: "Classificação ao vivo | Futebol Competitivo" };

export default function ClassificationPage() {
  return <Suspense fallback={<p className="resource-page" role="status">Carregando classificação…</p>}><LiveStandings /></Suspense>;
}
