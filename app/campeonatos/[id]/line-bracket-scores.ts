import type { Participant } from "../novo/championship-form";
import type { KnockoutTie } from "./championship-schedule";

// Keep each leg in the same participant order, even when home and away reverse.
export function lineBracketLegs(tie: KnockoutTie, sides: (Participant | null)[]) {
  const count = Math.max(tie.partidas.length, tie.tipo === "IDA_E_VOLTA" ? 2 : 1);
  return Array.from({ length: count }, (_, index) => {
    const match = tie.partidas[index];
    const scores = sides.map(participant => {
      if (!participant || !match?.resultado) return "–";
      const home = match.mandante.id === participant.id;
      if (!home && match.visitante.id !== participant.id) return "–";
      const goals = home ? match.resultado.golsMandante : match.resultado.golsVisitante;
      const penalties = home ? match.resultado.penaltisMandante : match.resultado.penaltisVisitante;
      return penalties == null ? String(goals) : `${goals} (${penalties})`;
    });
    return { label: count > 1 ? index === 0 ? "Ida" : "Volta" : "Jogo único", scores };
  });
}

export function lineBracketScores(tie: KnockoutTie, sides: (Participant | null)[]) {
  const legs = lineBracketLegs(tie, sides);
  return sides.map((_, side) => legs.map(leg => leg.scores[side]).join(" · "));
}
