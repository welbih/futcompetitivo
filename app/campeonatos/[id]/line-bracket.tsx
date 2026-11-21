"use client";

import { knockoutTies } from "./knockout-ties";
import { useState, type ComponentType } from "react";
import Image from "next/image";
import type { Participant } from "../novo/championship-form";
import type { KnockoutTie, SchedulePhase } from "./championship-schedule";
import { lineBracketLayout } from "./line-bracket-layout";
import { lineBracketLegs, lineBracketScores } from "./line-bracket-scores";
import { winner as tieWinner } from "./knockout-winner";
import { validYoutubeUrl } from "../../components/youtube-url";
import styles from "./line-bracket.module.css";

type Match = SchedulePhase["rodadas"][number]["partidas"][number];
type Props = { withdrawn?: number[]; twoSided?: boolean; organization: { id: number; nome: string; trofeuUrl?: string | null }; phase: SchedulePhase; participants: Participant[]; editable: boolean; isAdmin: boolean; onSelect: (match: Match) => void; Logo: ComponentType<{ participant: Participant }> };

export default function LineBracket({ organization, phase, participants, editable, isAdmin, onSelect, Logo, twoSided = false, withdrawn = [] }: Props) {
  const winner = (tie?: KnockoutTie) => tieWinner(tie, withdrawn);
  const [failedTrophy, setFailedTrophy] = useState<string | null>(null);
  const trophySource = organization.trofeuUrl ? `/api/organizacoes/${organization.id}/trofeu` : null;
  const layout = lineBracketLayout(phase, participants, !!trophySource, twoSided, withdrawn);
  const eliminated = new Set<number>();
  for (const tie of knockoutTies(phase)) {
    if (tie.terceiroLugar || tie.etapa?.codigo === "TERCEIRO_LUGAR") continue;
    const victorious = winner(tie);
    if (!victorious) continue;
    const match = tie.partidas[0];
    for (const participant of [match.mandante, match.visitante]) {
      if (participant.id !== victorious.id) eliminated.add(participant.id);
    }
  }
  const name = (participant: Participant | null) => participant ? participant.jogador.apelido || participant.jogador.nome : "A definir";
  function lineState(tie: KnockoutTie | undefined, participant: Participant | null | undefined) {
    if (!participant) return "pending";
    if (eliminated.has(participant.id)) return "eliminated";
    const victorious = winner(tie);
    if (victorious) return victorious.id === participant.id ? "winner" : "eliminated";
    return "ready";
  }
  function controls(tie: KnockoutTie) {
    return tie.partidas.map((match, index) => {
      const round = phase.rodadas.find(round => round.partidas.some(item => item.id === match.id));
      const playable = !match.wo && ((editable && round?.status === "EM_ANDAMENTO") || (isAdmin && !!match.resultado));
      const video = match.youtubeUrl && validYoutubeUrl(match.youtubeUrl) ? match.youtubeUrl : null;
      return <span key={match.id} className={styles.actions}>
        {match.wo && <small>W.O.</small>}{tie.partidas.length > 1 && <small>{index === 0 ? "Ida" : "Volta"}</small>}
        {playable && <button type="button" onClick={() => onSelect(match)} aria-label={`Editar partida ${match.id}`}>Placar</button>}
        {video && <a href={video} target="_blank" rel="noopener noreferrer">▶ Assistir partida</a>}
      </span>;
    });
  }
  return <>
    {trophySource && failedTrophy !== trophySource && layout.final && <div className={styles.finalTrophy} style={{ left: layout.finalX + (layout.finalWidth - 160) / 2, top: layout.centerY - 260 }}>
      <Image src={trophySource} alt={`Troféu de ${organization.nome}`} width={132} height={140} unoptimized onError={() => setFailedTrophy(trophySource)} />
    </div>}
    <svg className={styles.wires} width={layout.width} height={layout.height} aria-hidden="true">
      {layout.games.flatMap(game => game.inputs.map((input, side) => {
        const origin = side === 0 ? game.tie.origemUmId : game.tie.origemDoisId;
        const previous = layout.games.find(source => source.tie.id === origin);
        const state = lineState(game.tie, game.sides[side]);
        return <g key={`${game.tie.id}-${side}`}>
          <path data-state={state === "eliminated" ? "eliminated" : previous && winner(previous.tie) ? "winner" : state} d={`M ${input.x} ${input.y} H ${game.x}`} />
          <path data-state={game.sides[side] && winner(game.tie)?.id === game.sides[side]?.id ? state : "pending"} d={`M ${game.x} ${input.y} V ${game.y}`} />
        </g>;
      }))}
      {layout.finalInputs.map((input, side) => {
        const right = layout.split && side === 1;
        const edgeX = right ? layout.finalX + layout.finalWidth : layout.finalX;
        const endX = edgeX + (right ? -1 : 1);
        const elbow = right ? edgeX + 32 : edgeX - 32;
        const origin = side === 0 ? layout.final?.origemUmId : layout.final?.origemDoisId;
        const previous = layout.games.find(source => source.tie.id === origin);
        const state = lineState(layout.final, layout.finalSides[side]);
        return <g key={`final-${side}`}>
          <path data-state={state === "eliminated" ? "eliminated" : previous && winner(previous.tie) ? "winner" : state} d={`M ${input.x} ${input.y} H ${elbow}`} />
          <path data-state={state === "ready" ? "pending" : state} d={`M ${elbow} ${input.y} V ${layout.centerY}`} />
          <path className={styles.finalConnector} data-state={state === "ready" ? "pending" : state} d={`M ${elbow} ${layout.centerY} H ${endX}`} />
        </g>;
      })}
    </svg>
    {layout.leaves.map(leaf => <div key={leaf.key} className={styles.leaf} data-right={leaf.right} data-eliminated={!!leaf.participant && eliminated.has(leaf.participant.id)} style={{ left: leaf.x, top: leaf.y - 25 }}>
      {leaf.participant && <Logo participant={leaf.participant} />}<span><strong>{name(leaf.participant)}</strong></span>
    </div>)}
    {layout.games.map(game => {
      const scores = lineBracketScores(game.tie, game.sides);
      const victorious = winner(game.tie);
      return <div key={game.tie.id} data-motion-key={`junction-${game.tie.id}`} data-motion-value={JSON.stringify([game.sides.map(side => side?.id), scores, victorious?.id])} className={styles.junction} data-right={game.right} style={{ left: game.x - 42, top: game.y - 30 }}>
        <div className={styles.scores}>{scores.map((score, side) => <b key={side} title={game.tie.tipo === "IDA_E_VOLTA" ? "Ida · Volta (pênaltis entre parênteses)" : undefined} data-winner={!!game.sides[side] && victorious?.id === game.sides[side]?.id}>{score}</b>)}</div>
        <details className={styles.gameMenu}><summary aria-label={`Opções do confronto ${game.tie.id}`} title={game.tie.etapa?.nome || "Confronto"}>⋯</summary><div><button type="button" className={styles.closeMenu} aria-label="Fechar opções do confronto" onClick={event => {
          const menu = event.currentTarget.closest("details");
          if (menu) { menu.open = false; menu.querySelector("summary")?.focus(); }
        }}>×</button><strong>{game.tie.etapa?.nome || "Confronto"}</strong><span>{name(game.sides[0])} × {name(game.sides[1])}</span>{controls(game.tie)}{!game.tie.partidas.length && <small>Partida a definir</small>}</div></details>
      </div>;
    })}
    {[layout.final, layout.bronze].map((tie, index) => {
      if (!tie) return null;
      const sides = index === 0 ? layout.finalSides : [participants.find(p => p.id === tie.participanteUmId) || null, participants.find(p => p.id === tie.participanteDoisId) || null];
      const legs = lineBracketLegs(tie, sides);
      return <section key={tie.id} data-motion-key={`final-${tie.id}`} data-motion-value={JSON.stringify([sides.map(side => side?.id), legs, winner(tie)?.id])} className={styles.final} style={{ left: layout.finalX, width: layout.finalWidth, top: layout.centerY - 76 + index * 200 }} aria-label={index === 0 ? "Final" : "Disputa de terceiro lugar"}>
        <h3 className={index === 0 ? styles.finalTitle : undefined}>{index === 0 ? "Final" : "Disputa de 3º lugar"}</h3>
        <div className={styles.finalMatch}>
          <div className={styles.finalTeams} style={{ gap: layout.scoreWidth * 2 + 24 }}>{sides.map((participant, side) => <div key={side} data-eliminated={!!participant && !!winner(tie) && winner(tie)?.id !== participant.id}>{participant && <Logo participant={participant} />}<strong>{name(participant)}</strong></div>)}</div>
          <div className={styles.finalScore}>{legs.map(leg => <div key={leg.label} className={styles.legScore} aria-label={`${leg.label}: ${leg.scores[0]} a ${leg.scores[1]}`}>
            {legs.length > 1 && <small>{leg.label}</small>}<div><b data-winner={!!sides[0] && winner(tie)?.id === sides[0].id}>{leg.scores[0]}</b><span>×</span><b data-winner={!!sides[1] && winner(tie)?.id === sides[1].id}>{leg.scores[1]}</b></div>
          </div>)}</div>
        </div>
        <div className={styles.finalActions}>{controls(tie)}</div>
      </section>;
    })}
  </>;
}
