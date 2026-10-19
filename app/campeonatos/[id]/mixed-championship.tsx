"use client";

import { useState } from "react";
import type { Championship } from "../novo/championship-form";
import ChampionshipSchedule from "./championship-schedule";
import KnockoutBracket from "./knockout-bracket";
import ChampionshipScorers from "./championship-scorers";

export default function MixedChampionship({ championship, onUpdated }: { championship: Championship; onUpdated: (updated: Championship) => void }) {
  const league = championship.fases?.filter(phase => phase.quantidadeClassificados != null) || [];
  const leagueComplete = league.length > 0 && league.every(phase => phase.rodadas.length > 0 && phase.rodadas.every(round => round.status === "FINALIZADA"));
  const knockoutAvailable = leagueComplete && !!championship.fases?.some(phase => phase.tipo === "ELIMINATORIA");
  const [tab, setTab] = useState<"league" | "knockout" | "scorers">(() => knockoutAvailable ? "knockout" : "league");
  const knockoutVisible = tab === "knockout" && knockoutAvailable;
  const allRounds = championship.fases?.flatMap(phase => phase.rodadas) || [];
  return <section aria-label="Fases do campeonato misto">
    <div className="schedule-view-options" role="group" aria-label="Fases do campeonato">
      <button type="button" aria-pressed={tab !== "scorers" && !knockoutVisible} onClick={() => setTab("league")}>Fase de liga</button>
      <button type="button" aria-pressed={knockoutVisible} disabled={!knockoutAvailable} title={knockoutAvailable ? "Abrir chaveamento" : "Finalize a fase de liga para liberar o mata a mata"} onClick={() => setTab("knockout")}>Mata a mata</button>
      <button type="button" aria-pressed={tab === "scorers"} onClick={() => setTab("scorers")}>Artilheiro</button>
    </div>
    {!knockoutAvailable && <p className="form-note">O mata a mata será liberado após a finalização de todas as rodadas da fase de liga.</p>}
    {tab === "scorers" ? <><p className="form-note">Gols acumulados na fase de liga e no mata a mata. Disputas de pênaltis não entram na soma.</p><ChampionshipScorers rounds={allRounds} participants={championship.participantes} final={championship.status === "FINALIZADO"} /></> : knockoutVisible ? <KnockoutBracket championship={championship} onUpdated={onUpdated} embedded /> : <ChampionshipSchedule key={`${championship.id}-league-${leagueComplete}`} leagueStage qualifiedCount={league[0]?.quantidadeClassificados ?? undefined} phases={league} participants={championship.participantes} championshipId={championship.id} classifications={championship.classificacaoPorRodada} editable={championship.status === "EM_ANDAMENTO" && !leagueComplete} onUpdated={onUpdated} />}
  </section>;
}
