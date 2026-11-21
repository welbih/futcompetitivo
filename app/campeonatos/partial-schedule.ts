export type ScheduledRound = { partidas: { mandanteId: number | null; visitanteId: number | null }[] };

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
