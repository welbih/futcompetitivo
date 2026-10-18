import type { SchedulePhase } from "./championship-schedule";

export type PlayerRecord = { wins: number; losses: number; draws: number };

export function playerRecords(rounds: SchedulePhase["rodadas"], participants: { jogador: { id: number } }[]) {
  const records = new Map<number, PlayerRecord>(participants.map((participant) => [participant.jogador.id, { wins: 0, losses: 0, draws: 0 }]));
  for (const round of rounds) {
    for (const match of round.partidas) {
      if (match.status !== "FINALIZADA" || !match.resultado) continue;
      const home = records.get(match.mandante.jogador.id);
      const away = records.get(match.visitante.jogador.id);
      if (match.resultado.golsMandante === match.resultado.golsVisitante) {
        if (home) home.draws++;
        if (away) away.draws++;
      } else if (match.resultado.golsMandante > match.resultado.golsVisitante) {
        if (home) home.wins++;
        if (away) away.losses++;
      } else {
        if (home) home.losses++;
        if (away) away.wins++;
      }
    }
  }
  return records;
}
