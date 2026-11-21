"use client";

import { useState } from "react";
import ChampionshipStandings from "./championship-standings";
import type { SchedulePhase } from "./championship-schedule";
import { classificationRows } from "./provisional-standings";
import { groupRounds } from "./group-rounds";

export default function GroupStandings({ withdrawn = [], live = false, phase, rounds, roundNumber, complete, qualifiedIds }: { withdrawn?: number[]; live?: boolean; qualifiedIds?: number[]; phase: SchedulePhase; rounds: SchedulePhase["rodadas"]; roundNumber: number; complete: boolean }) {
  const [selectedGroup, setSelectedGroup] = useState("");
  const selectedExists = phase.grupos?.some(group => String(group.id) === selectedGroup);
  const groupCount = phase.grupos?.length || phase.quantidadeGrupos || 2;
  const qualifiers = phase.quantidadeClassificados;
  return <div className="group-standings">
    {(phase.grupos?.length || 0) > 1 && <div className="group-filter"><label htmlFor={`standings-group-${phase.id}`}>Grupo exibido</label><select id={`standings-group-${phase.id}`} value={selectedExists ? selectedGroup : ""} onChange={event => setSelectedGroup(event.target.value)}><option value="">Todos os grupos</option>{phase.grupos?.map(group => <option key={group.id} value={group.id}>{group.nome}</option>)}</select></div>}
    {qualifiers != null && <p className="form-note">{qualifiers} classificados no total: {Math.floor(qualifiers / groupCount)} por grupo{qualifiers % groupCount ? ` e ${qualifiers % groupCount} vaga(s) extra(s) entre os próximos colocados, por pontos, vitórias, saldo e gols por jogo` : ""}. O admin solicita o chaveamento após encerrar a fase.</p>}
    {phase.grupos?.filter(group => !selectedExists || String(group.id) === selectedGroup).map(group => {
      const filteredRounds = groupRounds(rounds, group);
      const official = live ? group.classificacaoAtual ?? undefined : group.classificacaoPorRodada?.find(classification => classification.rodada === roundNumber);
      const confirmed = complete && qualifiedIds != null;
      const qualification: Record<number, "qualified" | "extra"> = {};
      classificationRows(filteredRounds, group.participantes, official).filter(row => !withdrawn.includes(row.participant.id)).forEach((row, index) => {
        if (confirmed) {
          if (qualifiedIds.includes(row.participant.id)) qualification[row.participant.id] = "qualified";
        } else if (qualifiers != null) {
          if (index < Math.floor(qualifiers / groupCount)) qualification[row.participant.id] = "qualified";
          else if (qualifiers % groupCount && index === Math.floor(qualifiers / groupCount)) qualification[row.participant.id] = "extra";
        }
      });
      return <section key={group.id} aria-label={`Classificação do ${group.nome}`}>
        <h3 className="group-table-heading">{group.nome}</h3>
        <ChampionshipStandings withdrawn={withdrawn} rounds={filteredRounds} participants={group.participantes} official={official} stageComplete={complete} stageName="Fase de grupos" qualificationByParticipant={qualification} qualificationConfirmed={confirmed} />
      </section>;
    })}
    {!phase.grupos?.length && <p className="form-note">Os grupos não foram informados pela API. Atualize o campeonato para carregar a classificação.</p>}
  </div>;
}
