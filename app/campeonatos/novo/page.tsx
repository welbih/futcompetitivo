import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ChampionshipForm from "./championship-form";

export const metadata: Metadata = { title: "Criar campeonato | Futebol Competitivo" };

export default function NewChampionshipPage() {
  return (
    <main className="creation-page">
      <Link href="/" className="back-link">← Voltar para a arena</Link>
      <div className="creation-heading">
        <p className="eyebrow">NOVO CAMPEONATO / START</p>
        <h1>SUA PRÓXIMA <em>DISPUTA.</em></h1>
        <p>Escolha a organização, defina a edição e convoque os participantes.</p>
      </div>
      <Suspense fallback={<p role="status">Carregando formulário…</p>}><ChampionshipForm /></Suspense>
    </main>
  );
}

