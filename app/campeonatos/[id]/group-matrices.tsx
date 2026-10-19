import EncounterMatrix from "./encounter-matrix";
import { groupRounds } from "./group-rounds";
import type { SchedulePhase } from "./championship-schedule";

export default function GroupMatrices({ phase, rounds }: { phase: SchedulePhase; rounds: SchedulePhase["rodadas"] }) {
  return <div className="group-standings">
    {phase.grupos?.map(group => <section key={group.id} aria-label={`Matriz do ${group.nome}`}>
      <h3 className="group-table-heading">{group.nome}</h3>
      <EncounterMatrix rounds={groupRounds(rounds, group)} participants={group.participantes} />
    </section>)}
    {!phase.grupos?.length && <p className="form-note">Os grupos não foram informados pela API. Atualize o campeonato para carregar as matrizes.</p>}
  </div>;
}
