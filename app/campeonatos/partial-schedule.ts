export type ScheduledRound = { partidas: { mandanteId: number | null; visitanteId: number | null }[] };

export function partialScheduleProgress(rounds: ScheduledRound[], games: number, participantIds: number[]) {
  const entries = new Map(participantIds.map(id => [id, { id, count: 0, opponents: new Set<number>(), issues: new Set<string>() }]));
  for (const round of rounds) {
    const used = new Set<number>();
    for (const match of round.partidas) {
      const home = entries.get(match.mandanteId!), away = entries.get(match.visitanteId!);
      if (!home || !away || home.id === away.id) {
        for (const entry of new Set([home, away])) entry?.issues.add(home && away ? "Confronto consigo mesmo" : "Jogo com adversário pendente");
        continue;
      }
      for (const [entry, opponent] of [[home, away], [away, home]]) {
        entry.count++;
        if (used.has(entry.id)) entry.issues.add("Mais de um jogo na mesma rodada");
        if (entry.opponents.has(opponent.id)) entry.issues.add("Adversário repetido");
        used.add(entry.id); entry.opponents.add(opponent.id);
      }
    }
  }
  const configured = Number.isSafeInteger(games) && games >= 3;
  return [...entries.values()].map(entry => ({
    id: entry.id, count: entry.count, uniqueOpponents: entry.opponents.size,
    missing: configured ? Math.max(0, games - entry.count) : 0,
    extra: configured ? Math.max(0, entry.count - games) : 0,
    issues: [...entry.issues],
    complete: configured && entry.count === games && entry.issues.size === 0,
  }));
}

export function validPartialSchedule(value: unknown, games: number, participantIds?: number[]): value is ScheduledRound[] {
  if (!Array.isArray(value) || !value.length || !Number.isSafeInteger(games) || games < 3) return false;
  const counts = new Map<number, number>(), pairs = new Set<string>();
  for (const round of value) {
    if (!Array.isArray(round?.partidas) || !round.partidas.length) return false;
    const used = new Set<number>();
    for (const match of round.partidas) {
      const home = match?.mandanteId, away = match?.visitanteId;
      if (!Number.isSafeInteger(home) || home <= 0 || !Number.isSafeInteger(away) || away <= 0 || home === away || used.has(home) || used.has(away)) return false;
      const key = [home, away].sort((a, b) => a - b).join("-");
      if (pairs.has(key)) return false;
      pairs.add(key);
      for (const id of [home, away]) { used.add(id); counts.set(id, (counts.get(id) || 0) + 1); }
    }
  }
  const ids = [...counts.keys()];
  return ids.length > games && ids.every(id => counts.get(id) === games) && (!participantIds || participantIds.length === ids.length && participantIds.every(id => counts.has(id)));
}
