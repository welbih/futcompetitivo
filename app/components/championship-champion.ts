import { knockoutTies } from "../campeonatos/[id]/knockout-ties";
import type { Championship } from "../campeonatos/novo/championship-form";
import { winner } from "../campeonatos/[id]/knockout-winner";

export function championshipChampion(championship: Pick<Championship, "status" | "fases" | "classificacaoPorRodada">) {
  if (championship.status !== "FINALIZADO") return null;
  const knockout = championship.fases?.filter(phase => phase.tipo === "ELIMINATORIA").at(-1);
  if (knockout) {
    const ties = knockoutTies(knockout).filter(tie => !tie.terceiroLugar && tie.etapa?.codigo !== "TERCEIRO_LUGAR");
    const final = ties.find(tie => tie.etapa?.codigo === "FINAL") || ties.at(-1);
    return winner(final);
  }
  const official = championship.classificacaoPorRodada?.toSorted((a, b) => b.rodada - a.rodada)[0];
  return official?.tabela.find(row => row.posicaoAtual === 1)?.participante || null;
}
