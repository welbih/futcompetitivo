export type ManualTie = { mandanteId: number | null; visitanteId: number | null };

export function firstRoundSize(count: number) {
  return count < 2 ? 0 : 2 ** Math.ceil(Math.log2(count)) / 2;
}

export function validManualTies(value: unknown, participantIds?: number[]): value is ManualTie[] {
  if (!Array.isArray(value) || !value.length) return false;
  const ids: number[] = [];
  for (const tie of value) {
    if (!tie || typeof tie !== "object") return false;
    for (const id of [tie.mandanteId, tie.visitanteId]) {
      if (id === null) continue;
      if (!Number.isSafeInteger(id) || id <= 0) return false;
      ids.push(id);
    }
    if (tie.mandanteId === null && tie.visitanteId === null) return false;
  }
  if (ids.length < 4 || new Set(ids).size !== ids.length || value.length !== firstRoundSize(ids.length)) return false;
  return !participantIds || (participantIds.length === ids.length && participantIds.every(id => ids.includes(id)));
}
