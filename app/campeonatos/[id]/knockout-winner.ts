import type { KnockoutTie } from "./championship-schedule";

export function winner(tie?: KnockoutTie, withdrawn: number[] = []) {
  if (!tie || tie.partidas.length !== Math.max(tie.partidas.length, tie.tipo === "IDA_E_VOLTA" ? 2 : 1)) return null;
  const first = tie.partidas[0];
  const homeWithdrawn = withdrawn.includes(first.mandante.id);
  const awayWithdrawn = withdrawn.includes(first.visitante.id);
  if (homeWithdrawn !== awayWithdrawn) return homeWithdrawn ? first.visitante : first.mandante;
  if (homeWithdrawn && awayWithdrawn) return null;
  let goalDifference = 0;
  for (const match of tie.partidas) {
    if (match.status !== "FINALIZADA" || !match.resultado) return null;
    const difference = match.resultado.golsMandante - match.resultado.golsVisitante;
    goalDifference += match.mandante.id === first.mandante.id ? difference : -difference;
  }
  if (goalDifference !== 0) return goalDifference > 0 ? first.mandante : first.visitante;
  const decisive = tie.partidas.at(-1)!;
  const { penaltisMandante, penaltisVisitante } = decisive.resultado!;
  if (penaltisMandante == null || penaltisVisitante == null || penaltisMandante === penaltisVisitante) return null;
  return penaltisMandante > penaltisVisitante ? decisive.mandante : decisive.visitante;
}
