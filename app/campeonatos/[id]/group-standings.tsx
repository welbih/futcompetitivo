import ChampionshipStandings from "./championship-standings";
import type { SchedulePhase } from "./championship-schedule";
import { classificationRows } from "./provisional-standings";
import { groupRounds } from "./group-rounds";

export default function GroupStandings({ phase, rounds, roundNumber, complete, qualifiedIds }: { qualifiedIds?: number[]; phase: SchedulePhase; rounds: SchedulePhase["rodadas"]; roundNumber: number; complete: boolean }) {
  const qualifiers = phase.quantidadeClassificados;
  return <div className="group-standings">
    {qualifiers != null && <p className="form-note">{qualifiers} classificados no total: {Math.floor(qualifiers / 2)} por grupo{qualifiers % 2 ? " e uma vaga extra definida pela API entre os próximos colocados, considerando o desempenho" : ""}. O chaveamento é definido ao encerrar a fase.</p>}
    {phase.grupos?.map(group => {
      const filteredRounds = groupRounds(rounds, group);
      const official = group.classificacaoPorRodada?.find(classification => classification.rodada === roundNumber);
      const confirmed = complete && qualifiedIds != null;
      const qualification: Record<number, "qualified" | "extra"> = {};
      classificationRows(filteredRounds, group.participantes, official).forEach((row, index) => {
        if (confirmed) {
          if (qualifiedIds.includes(row.participant.id)) qualification[row.participant.id] = "qualified";
        } else if (qualifiers != null) {
          if (index < Math.floor(qualifiers / 2)) qualification[row.participant.id] = "qualified";
          else if (qualifiers % 2 && index === Math.floor(qualifiers / 2)) qualification[row.participant.id] = "extra";
        }
      });
      return <section key={group.id} aria-label={`Classificação do ${group.nome}`}>
        <h3 className="group-table-heading">{group.nome}</h3>
        <ChampionshipStandings rounds={filteredRounds} participants={group.participantes} official={official} stageComplete={complete} stageName="Fase de grupos" qualificationByParticipant={qualification} qualificationConfirmed={confirmed} />
      </section>;
    })}
    {!phase.grupos?.length && <p className="form-note">Os grupos não foram informados pela API. Atualize o campeonato para carregar a classificação.</p>}
  </div>;
}
