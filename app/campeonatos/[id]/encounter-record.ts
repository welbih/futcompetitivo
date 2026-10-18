import type { SchedulePhase } from "./championship-schedule";

export type Encounter = { outcome: "win" | "loss" | "draw"; goals: number; opponentGoals: number };

export function encounterRecords(rounds: SchedulePhase["rodadas"]) {
  const records = new Map<string, Encounter[]>();
  for (const round of rounds) for (const match of round.partidas) {
    if (match.status !== "FINALIZADA" || !match.resultado) continue;
    const { golsMandante: home, golsVisitante: away } = match.resultado;
    for (const [player, opponent, goals, opponentGoals] of [
      [match.mandante.jogador.id, match.visitante.jogador.id, home, away],
      [match.visitante.jogador.id, match.mandante.jogador.id, away, home],
    ]) {
      const key = `${player}-${opponent}`;
      const entry: Encounter = { outcome: goals > opponentGoals ? "win" : goals < opponentGoals ? "loss" : "draw", goals, opponentGoals };
      records.set(key, [...(records.get(key) || []), entry]);
    }
  }
  return records;
}
