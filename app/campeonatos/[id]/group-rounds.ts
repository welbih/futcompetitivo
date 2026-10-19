import type { ChampionshipGroup, SchedulePhase } from "./championship-schedule";

export function groupRounds(rounds: SchedulePhase["rodadas"], group: ChampionshipGroup): SchedulePhase["rodadas"] {
  const members = new Set(group.participantes.map(participant => participant.id));
  return rounds.map(round => ({ ...round, partidas: round.partidas.filter(match => members.has(match.mandante.id) && members.has(match.visitante.id)) }));
}
