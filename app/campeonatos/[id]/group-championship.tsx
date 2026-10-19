"use client";

import { useState } from "react";
import type { Championship } from "../novo/championship-form";
import ChampionshipSchedule from "./championship-schedule";
import KnockoutBracket from "./knockout-bracket";
import ChampionshipScorers from "./championship-scorers";

export default function GroupChampionship({ championship, onUpdated }: { championship: Championship; onUpdated: (updated: Championship) => void }) {
  const phases = championship.fases?.filter(phase => phase.tipo === "GRUPOS") || [];
  const complete = phases.length > 0 && phases.every(phase => phase.rodadas.length > 0 && phase.rodadas.every(round => round.status === "FINALIZADA"));
  const knockoutAvailable = complete && !!championship.fases?.some(phase => phase.tipo === "ELIMINATORIA");
  const [tab, setTab] = useState<"groups" | "knockout" | "scorers">(() => knockoutAvailable ? "knockout" : "groups");
  const knockoutVisible = tab === "knockout" && knockoutAvailable;
  const knockoutTies = championship.fases?.filter(phase => phase.tipo === "ELIMINATORIA").flatMap(phase => phase.confrontos || []);
  const qualifiedIds = knockoutAvailable && knockoutTies?.length ? [...new Set(knockoutTies.flatMap(tie => [tie.participanteUmId, tie.participanteDoisId]).filter((id): id is number => id != null))] : undefined;
  const allRounds = championship.fases?.flatMap(phase => phase.rodadas) || [];
  return <section aria-label="Campeonato com fase de grupos">
    <div className="schedule-view-options" role="group" aria-label="Abas da fase de grupos">
      <button type="button" aria-pressed={tab !== "scorers" && !knockoutVisible} onClick={() => setTab("groups")}>Fase de grupos</button>
      <button type="button" aria-pressed={knockoutVisible} disabled={!knockoutAvailable} title={knockoutAvailable ? "Abrir chaveamento" : "Finalize a fase de grupos para liberar o mata a mata"} onClick={() => setTab("knockout")}>Mata a mata</button>
      <button type="button" aria-pressed={tab === "scorers"} onClick={() => setTab("scorers")}>Artilheiro</button>
    </div>
    {!knockoutAvailable && <p className="form-note">O mata a mata será liberado após a finalização de todas as rodadas da fase de grupos.</p>}
    {tab === "scorers" ? <><p className="form-note">Gols acumulados na fase de grupos e no mata a mata. Disputas de pênaltis não entram na soma.</p><ChampionshipScorers rounds={allRounds} participants={championship.participantes} final={championship.status === "FINALIZADO"} /></> : knockoutVisible ? <KnockoutBracket championship={championship} onUpdated={onUpdated} embedded /> : <ChampionshipSchedule key={`${championship.id}-groups-${complete}`} groupStage groupQualifiedIds={qualifiedIds} phases={phases} participants={championship.participantes} championshipId={championship.id} editable={championship.status === "EM_ANDAMENTO" && !complete} onUpdated={onUpdated} />}
  </section>;
}
