import type { Championship, Participant } from "../campeonatos/novo/championship-form";
import { championshipChampion } from "../components/championship-champion";

export type HallEdition = { championship: Championship; champion: Participant; runnerUp: Participant | null };
export type HallRank = { player: Participant["jogador"]; titles: number; runnersUp: number; finals: number; position: number };

export function hallEditions(championships: Championship[]): HallEdition[] {
  const editions: HallEdition[] = [];
  for (const championship of championships) {
    const champion = championshipChampion(championship);
    if (!champion) continue;
    let runnerUp: Participant | null = null;
    const knockout = championship.fases?.filter(phase => phase.tipo === "ELIMINATORIA").at(-1);
    if (knockout) {
      const ties = knockout.confrontos?.filter(tie => !tie.terceiroLugar && tie.etapa?.codigo !== "TERCEIRO_LUGAR") || [];
      const final = ties.find(tie => tie.etapa?.codigo === "FINAL") || ties.at(-1);
      const match = final?.partidas[0];
      if (match) runnerUp = match.mandante.id === champion.id ? match.visitante : match.mandante;
    } else {
      const official = championship.classificacaoPorRodada?.toSorted((a, b) => b.rodada - a.rodada)[0];
      runnerUp = official?.tabela.find(row => row.posicaoAtual === 2)?.participante || null;
    }
    editions.push({ championship, champion, runnerUp });
  }
  return editions.sort((a, b) => b.championship.edicao - a.championship.edicao || b.championship.id - a.championship.id);
}

export function hallRanking(editions: HallEdition[]): HallRank[] {
  const players = new Map<number, HallRank>();
  for (const edition of editions) {
    for (const [participant, title] of [[edition.champion, true], [edition.runnerUp, false]] as const) {
      if (!participant) continue;
      const row = players.get(participant.jogador.id) || { player: participant.jogador, titles: 0, runnersUp: 0, finals: 0, position: 0 };
      if (title) row.titles++;
      else row.runnersUp++;
      row.finals++;
      players.set(participant.jogador.id, row);
    }
  }
  const rows = [...players.values()].sort((a, b) => b.titles - a.titles || b.runnersUp - a.runnersUp || a.player.nome.localeCompare(b.player.nome, "pt-BR"));
  rows.forEach((row, index) => {
    const previous = rows[index - 1];
    row.position = previous && row.titles === previous.titles && row.runnersUp === previous.runnersUp ? previous.position : index + 1;
  });
  return rows;
}

export const hallPlayerName = (player: Participant["jogador"]) => player.apelido?.trim() || player.nome;
