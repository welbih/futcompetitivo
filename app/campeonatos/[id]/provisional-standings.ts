import type { Participant } from "../novo/championship-form";
import type { SchedulePhase } from "./championship-schedule";

export function provisionalStandings(rounds: SchedulePhase["rodadas"], participants: Participant[]) {
  const rows = new Map(participants.map((participant) => [participant.id, { participant, points: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 }]));
  for (const round of rounds) for (const match of round.partidas) {
    if (match.status !== "FINALIZADA" || !match.resultado) continue;
    const { golsMandante: home, golsVisitante: away } = match.resultado;
    for (const [id, scored, conceded] of [[match.mandante.id, home, away], [match.visitante.id, away, home]]) {
      const row = rows.get(id);
      if (!row) continue;
      row.played++; row.goalsFor += scored; row.goalsAgainst += conceded; row.goalDifference = row.goalsFor - row.goalsAgainst;
      if (scored > conceded) { row.wins++; row.points += 3; }
      else if (scored === conceded) { row.draws++; row.points++; }
      else row.losses++;
    }
  }
  const compare = (a: typeof rows extends Map<number, infer R> ? R : never, b: typeof a) => b.points - a.points || b.wins - a.wins || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor;
  const sorted = [...rows.values()].sort((a, b) => compare(a, b) || a.participant.jogador.nome.localeCompare(b.participant.jogador.nome, "pt-BR"));
  let position = 1;
  return sorted.map((row, index) => {
    if (index && compare(row, sorted[index - 1]) !== 0) position = index + 1;
    return { ...row, position };
  });
}

export function standingsWithMovement(rounds: SchedulePhase["rodadas"], participants: Participant[]) {
  const current = provisionalStandings(rounds, participants);
  const previous = rounds.length > 1 ? new Map(provisionalStandings(rounds.slice(0, -1), participants).map((row) => [row.participant.id, row.position])) : new Map<number, number>();
  return current.map((row) => {
    const previousPosition = previous.get(row.participant.id) ?? row.position;
    const variation = previousPosition - row.position;
    return { ...row, previousPosition, variation, movement: variation > 0 ? "up" as const : variation < 0 ? "down" as const : "same" as const };
  });
}

export function topScorers(rounds: SchedulePhase["rodadas"], participants: Participant[]) {
  const rows = provisionalStandings(rounds, participants).sort((a, b) => b.goalsFor - a.goalsFor || a.participant.jogador.nome.localeCompare(b.participant.jogador.nome, "pt-BR"));
  let position = 1;
  return rows.map((row, index) => {
    if (index && row.goalsFor !== rows[index - 1].goalsFor) position = index + 1;
    return { ...row, position };
  });
}

export type OfficialClassification = {
  rodada: number;
  tabela: { participante: Participant; pontos: number; jogos: number; vitorias: number; empates: number; derrotas: number; golsPro: number; golsContra: number; saldoGols: number; posicaoAtual: number; posicaoAnterior: number; variacao: number; movimentacao: string }[];
};

export function classificationRows(rounds: SchedulePhase["rodadas"], participants: Participant[], official?: OfficialClassification) {
  if (!official) return standingsWithMovement(rounds, participants);
  return [...official.tabela].sort((a, b) => a.posicaoAtual - b.posicaoAtual).map((row) => ({
    participant: row.participante, points: row.pontos, played: row.jogos, wins: row.vitorias, draws: row.empates, losses: row.derrotas,
    goalsFor: row.golsPro, goalsAgainst: row.golsContra, goalDifference: row.saldoGols, position: row.posicaoAtual,
    previousPosition: row.posicaoAnterior, variation: row.posicaoAnterior - row.posicaoAtual,
    movement: row.movimentacao === "SUBIU" ? "up" as const : row.movimentacao === "DESCEU" ? "down" as const : "same" as const,
  }));
}
