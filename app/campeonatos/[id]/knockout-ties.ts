import type { KnockoutTie, SchedulePhase } from "./championship-schedule";

export function knockoutTies(phase: SchedulePhase): KnockoutTie[] {
  const matches = new Map(phase.rodadas.flatMap(round => round.partidas).map(match => [match.id, match]));
  return (phase.confrontos || []).map(tie => {
    const legacy = tie.partidas || [];
    if (tie.partidaIds != null) {
      const resolved = tie.partidaIds.map(id => matches.get(id) || legacy.find(match => match.id === id));
      // Do not infer a winner from a partially resolved two-leg tie.
      const complete = resolved.every((match): match is KnockoutTie["partidas"][number] => !!match);
      return { ...tie, partidas: complete ? resolved : [] };
    }
    return { ...tie, partidas: legacy.map(match => matches.get(match.id) || match) };
  });
}
