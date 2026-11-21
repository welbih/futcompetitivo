import type { Metadata } from "next";
import { Suspense } from "react";
import LiveKnockout from "./live-knockout";

export const metadata: Metadata = { title: "Mata-mata ao vivo | Futebol Competitivo" };

export default function KnockoutPage() {
  return <Suspense fallback={<p className="resource-page" role="status">Carregando mata-mata…</p>}><LiveKnockout /></Suspense>;
}
