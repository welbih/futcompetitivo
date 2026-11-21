import type { KnockoutTie, SchedulePhase } from "./championship-schedule";

export function knockoutParticipantCount(phase: SchedulePhase, fallback = 0) {
  const ids = new Set<number>();
  for (const tie of knockoutTies(phase)) {
    for (const id of [tie.participanteUmId, tie.participanteDoisId]) if (id != null) ids.add(id);
    for (const match of tie.partidas) { ids.add(match.mandante.id); ids.add(match.visitante.id); }
  }
  return ids.size || fallback;
}

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
