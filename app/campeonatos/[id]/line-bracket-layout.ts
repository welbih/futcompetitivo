import { knockoutTies } from "./knockout-ties";
import type { Participant } from "../novo/championship-form";
import type { KnockoutTie, SchedulePhase } from "./championship-schedule";
import { winner } from "./knockout-winner";

export type LinePoint = { x: number; y: number };
export type LineLeaf = LinePoint & { participant: Participant | null; right: boolean; key: string };
export type LineGame = LinePoint & { tie: KnockoutTie; right: boolean; inputs: LinePoint[]; sides: (Participant | null)[] };

export function lineBracketLayout(phase: SchedulePhase, participants: Participant[], withTrophy = false) {
  const ties = knockoutTies(phase);
  const main = ties.filter(tie => !tie.terceiroLugar && tie.etapa?.codigo !== "TERCEIRO_LUGAR");
  const final = main.find(tie => tie.etapa?.codigo === "FINAL") || main.at(-1);
  const bronze = ties.find(tie => tie.terceiroLugar || tie.etapa?.codigo === "TERCEIRO_LUGAR");
  const byId = new Map(ties.map(tie => [tie.id, tie]));
  const split = participants.length > 8;
  const scoreWidth = Math.max(64, ...ties.map(tie => {
    const goals = tie.partidas.reduce((sum, match) => sum + (match.resultado?.golsMandante || 0) + (match.resultado?.golsVisitante || 0), 0);
    const penalties = tie.partidas.at(-1)?.resultado;
    const penaltyDigits = Math.max(String(penalties?.penaltisMandante ?? "").length, String(penalties?.penaltisVisitante ?? "").length);
    return (String(goals).length + (penaltyDigits ? penaltyDigits + 3 : 0)) * 9 + 12;
  }));
  const spacing = Math.max(120, scoreWidth + 48);
  const rowSpacing = split ? ties.some(tie => tie.tipo === "IDA_E_VOLTA" || tie.partidas.some(match => match.resultado?.penaltisMandante != null)) ? 96 : 84 : 58;
  const finalWidth = Math.max(320, scoreWidth * 2 + 180);
  const armWidth = 280 + Math.max(1, phase.rodadas.length - 1) * spacing;
  const finalX = armWidth + scoreWidth + 56;
  const width = split ? finalX * 2 + finalWidth : finalX + finalWidth + 24;
  const leaves: LineLeaf[] = [];
  const games: LineGame[] = [];
  const counts = [0, 0];
  const participant = (id: number | null) => participants.find(value => value.id === id) || null;

  function branch(id: number | null, origin: number | null, right: boolean, key: string, visited: Set<number>): { point: LinePoint; side: Participant | null } {
    const source = origin == null ? undefined : byId.get(origin);
    if (source && !visited.has(source.id)) {
      const next = new Set(visited).add(source.id);
      const automatic = !source.origemUmId && !source.origemDoisId && !source.partidas.length && (!source.participanteUmId || !source.participanteDoisId);
      if (automatic) return branch(source.participanteUmId || source.participanteDoisId, null, right, key, next);
      const one = branch(source.participanteUmId, source.origemUmId, right, `${key}-1`, next);
      const two = branch(source.participanteDoisId, source.origemDoisId, right, `${key}-2`, next);
      const x = right ? Math.min(one.point.x, two.point.x) - spacing : Math.max(one.point.x, two.point.x) + spacing;
      const point = { x, y: (one.point.y + two.point.y) / 2 };
      games.push({ ...point, tie: source, right, inputs: [one.point, two.point], sides: [one.side, two.side] });
      return { point, side: participant(id) || winner(source) };
    }
    const y = 88 + (withTrophy ? 180 : 0) + counts[right ? 1 : 0]++ * rowSpacing;
    const x = right ? width - 256 : 256;
    leaves.push({ x: right ? width - 256 : 24, y, participant: participant(id), right, key });
    return { point: { x, y }, side: participant(id) };
  }

  let finalSides: (Participant | null)[] = [];
  let finalInputs: LinePoint[] = [];
  if (final) {
    const one = branch(final.participanteUmId, final.origemUmId, false, "final-1", new Set([final.id]));
    const two = branch(final.participanteDoisId, final.origemDoisId, split, "final-2", new Set([final.id]));
    finalSides = [one.side, two.side]; finalInputs = [one.point, two.point];
  }
  const centerY = finalInputs.length ? (finalInputs[0].y + finalInputs[1].y) / 2 : 150;
  const height = Math.max(360, ...leaves.map(leaf => leaf.y + 76), centerY + (bronze ? 340 : 150));
  return { width, height, split, leaves, games, final, bronze, finalX, finalWidth, scoreWidth, centerY, finalSides, finalInputs };
}
