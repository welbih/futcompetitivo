"use client";

import { useState, type ComponentType } from "react";
import Image from "next/image";
import type { Participant } from "../novo/championship-form";
import type { KnockoutTie, SchedulePhase } from "./championship-schedule";
import { lineBracketLayout } from "./line-bracket-layout";
import { winner } from "./knockout-winner";
import { validYoutubeUrl } from "../../components/youtube-url";
import styles from "./line-bracket.module.css";

type Match = SchedulePhase["rodadas"][number]["partidas"][number];
type Props = { organization: { id: number; nome: string; trofeuUrl?: string | null }; phase: SchedulePhase; participants: Participant[]; editable: boolean; isAdmin: boolean; onSelect: (match: Match) => void; Logo: ComponentType<{ participant: Participant }> };

function totals(tie: KnockoutTie, sides: (Participant | null)[]) {
  const scores = [0, 0];
  if (!tie.partidas.length || tie.partidas.some(match => !match.resultado)) return ["–", "–"];
  for (const match of tie.partidas) {
    const home = match.mandante.id === sides[0]?.id ? 0 : 1;
    scores[home] += match.resultado!.golsMandante;
    scores[1 - home] += match.resultado!.golsVisitante;
  }
  const last = tie.partidas.at(-1)!;
  return scores.map((score, side) => {
    const penalties = last.mandante.id === sides[side]?.id ? last.resultado?.penaltisMandante : last.resultado?.penaltisVisitante;
    return penalties == null ? String(score) : `${score} (${penalties})`;
  });
}

export default function LineBracket({ organization, phase, participants, editable, isAdmin, onSelect, Logo }: Props) {
  const [failedTrophy, setFailedTrophy] = useState<string | null>(null);
  const trophySource = organization.trofeuUrl ? `/api/organizacoes/${organization.id}/trofeu` : null;
  const layout = lineBracketLayout(phase, participants, !!trophySource);
  const name = (participant: Participant | null) => participant ? participant.jogador.apelido || participant.jogador.nome : "A definir";
  function controls(tie: KnockoutTie) {
    return tie.partidas.map((match, index) => {
      const round = phase.rodadas.find(round => round.partidas.some(item => item.id === match.id));
      const playable = (editable && round?.status === "EM_ANDAMENTO") || (isAdmin && !!match.resultado);
      const video = match.youtubeUrl && validYoutubeUrl(match.youtubeUrl) ? match.youtubeUrl : null;
      return <span key={match.id} className={styles.actions}>
        {tie.partidas.length > 1 && <small>{index === 0 ? "Ida" : "Volta"}</small>}
        {playable && <button type="button" onClick={() => onSelect(match)} aria-label={`Editar partida ${match.id}`}>Placar</button>}
        {video && <a href={video} target="_blank" rel="noopener noreferrer">▶ Assistir partida</a>}
      </span>;
    });
  }
  return <>
    {trophySource && failedTrophy !== trophySource && layout.final && <div className={styles.finalTrophy} style={{ left: layout.finalX + 80, top: layout.centerY - 260 }}>
      <Image src={trophySource} alt={`Troféu de ${organization.nome}`} width={132} height={140} unoptimized onError={() => setFailedTrophy(trophySource)} />
    </div>}
    <svg className={styles.wires} width={layout.width} height={layout.height} aria-hidden="true">
      {layout.games.flatMap(game => game.inputs.map((input, side) => <path key={`${game.tie.id}-${side}`} data-winner={!!game.sides[side] && winner(game.tie)?.id === game.sides[side]?.id} d={`M ${input.x} ${input.y} H ${game.x} V ${game.y}`} />))}
      {layout.finalInputs.map((input, side) => {
        const endX = layout.split && side === 1 ? layout.finalX + 320 : layout.finalX;
        const elbow = layout.split && side === 1 ? endX + 32 : endX - 32;
        return <path key={`final-${side}`} d={`M ${input.x} ${input.y} H ${elbow} V ${layout.centerY} H ${endX}`} />;
      })}
    </svg>
    {layout.leaves.map(leaf => <div key={leaf.key} className={styles.leaf} data-right={leaf.right} data-eliminated={!!leaf.participant && (phase.confrontos || []).some(tie => {
      if (tie.terceiroLugar || tie.etapa?.codigo === "TERCEIRO_LUGAR") return false;
      const victorious = winner(tie);
      return !!victorious && victorious.id !== leaf.participant!.id && tie.partidas.some(match => match.mandante.id === leaf.participant!.id || match.visitante.id === leaf.participant!.id);
    })} style={{ left: leaf.x, top: leaf.y - 25 }}>
      {leaf.participant && <Logo participant={leaf.participant} />}<span><strong>{name(leaf.participant)}</strong></span>
    </div>)}
    {layout.games.map(game => {
      const scores = totals(game.tie, game.sides);
      const victorious = winner(game.tie);
      return <div key={game.tie.id} className={styles.junction} data-right={game.right} style={{ left: game.x - 42, top: game.y - 30 }}>
        <div className={styles.scores}>{scores.map((score, side) => <b key={side} data-winner={!!game.sides[side] && victorious?.id === game.sides[side]?.id}>{score}</b>)}</div>
        <details className={styles.gameMenu}><summary aria-label={`Opções do confronto ${game.tie.id}`} title={game.tie.etapa?.nome || "Confronto"}>⋯</summary><div><button type="button" className={styles.closeMenu} aria-label="Fechar opções do confronto" onClick={event => {
          const menu = event.currentTarget.closest("details");
          if (menu) { menu.open = false; menu.querySelector("summary")?.focus(); }
        }}>×</button><strong>{game.tie.etapa?.nome || "Confronto"}</strong><span>{name(game.sides[0])} × {name(game.sides[1])}</span>{controls(game.tie)}{!game.tie.partidas.length && <small>Partida a definir</small>}</div></details>
      </div>;
    })}
    {[layout.final, layout.bronze].map((tie, index) => {
      if (!tie) return null;
      const sides = index === 0 ? layout.finalSides : [participants.find(p => p.id === tie.participanteUmId) || null, participants.find(p => p.id === tie.participanteDoisId) || null];
      const scores = totals(tie, sides);
      return <section key={tie.id} className={styles.final} style={{ left: layout.finalX, top: layout.centerY - 76 + index * 200 }} aria-label={index === 0 ? "Final" : "Disputa de terceiro lugar"}>
        <h3 className={index === 0 ? styles.finalTitle : undefined}>{index === 0 ? "Final" : "Disputa de 3º lugar"}</h3>
        <div className={styles.finalMatch}>
          <div className={styles.finalTeams}>{sides.map((participant, side) => <div key={side} data-eliminated={!!participant && !!winner(tie) && winner(tie)?.id !== participant.id}>{participant && <Logo participant={participant} />}<strong>{name(participant)}</strong></div>)}</div>
          <div className={styles.finalScore} aria-label={`Placar: ${scores[0]} a ${scores[1]}`}><b data-winner={!!sides[0] && winner(tie)?.id === sides[0].id}>{scores[0]}</b><span>×</span><b data-winner={!!sides[1] && winner(tie)?.id === sides[1].id}>{scores[1]}</b></div>
        </div>
        <div className={styles.finalActions}>{controls(tie)}</div>
      </section>;
    })}
  </>;
}
