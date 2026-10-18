import { Suspense } from "react";
import ChampionshipDetails from "./championship-details";

export default function ChampionshipPage() {
  return <Suspense fallback={<p className="resource-page" role="status">Carregando campeonato…</p>}><ChampionshipDetails /></Suspense>;
}
