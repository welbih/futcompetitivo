"use client";

import { useState } from "react";
import Image from "next/image";
import type { Championship, Participant } from "../novo/championship-form";
import type { KnockoutTie, SchedulePhase } from "./championship-schedule";
import MatchResultDialog from "./match-result-dialog";
import styles from "./knockout-bracket.module.css";

type Match = SchedulePhase["rodadas"][number]["partidas"][number];
export function winner(match?: Match) {
  const score = match?.resultado;
  if (!match || match.status !== "FINALIZADA" || !score) return null;
  if (score.golsMandante !== score.golsVisitante) return score.golsMandante > score.golsVisitante ? match.mandante : match.visitante;
  if (score.penaltisMandante == null || score.penaltisVisitante == null || score.penaltisMandante === score.penaltisVisitante) return null;
  return score.penaltisMandante > score.penaltisVisitante ? match.mandante : match.visitante;
}
function Logo({ participant }: { participant: Participant }) {
  const url = participant.equipe.logoUrl?.trim();
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={styles.logo}>{url && failed !== url && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) ? <Image src={url} alt={participant.equipe.nome} width={28} height={28} unoptimized onError={() => setFailed(url)} /> : participant.equipe.nome.slice(0, 2).toUpperCase()}</span>;
}
export default function KnockoutBracket({ championship, onUpdated }: { championship: Championship; onUpdated: (updated: Championship) => void }) {
  const [selected, setSelected] = useState<Match | null>(null);
  const phases = championship.fases?.filter(phase => phase.tipo === "ELIMINATORIA") || [];
  const editable = championship.status === "EM_ANDAMENTO";
  return <section aria-labelledby="knockout-title" className={styles.panel}>
    <div className="schedule-view-options" role="group" aria-label="Visualização do campeonato"><button type="button" aria-pressed="true">Mata a mata</button></div>
    <header className={styles.heading}><div><p className="eyebrow">O CAMINHO ATÉ A TAÇA</p><h2 id="knockout-title">Mata a mata</h2><p>Jogo único · Cada vitória aproxima você do título</p></div><span className={styles.badge}>ELIMINATÓRIO</span></header>
    <p className={styles.hint}>{editable ? "Selecione uma partida da etapa em andamento para registrar o placar. A próxima etapa é liberada ao concluir todos os jogos." : "Campeonato finalizado. Confira o caminho do campeão."} Arraste a barra horizontal para explorar o chaveamento.</p>
    {phases.map(phase => {
      const rounds = [...phase.rodadas].sort((a,b) => a.numero-b.numero);
      const ties = phase.confrontos || [];
      const groups: KnockoutTie[][] = []; let offset = 0;
      for (let i=0; i<rounds.length; i++) { const count = 2 ** (rounds.length-i-1); groups.push(ties.slice(offset,offset+count)); offset += count; }
      const automatic = (tie: KnockoutTie) => !tie.origemUmId && !tie.origemDoisId && !tie.partidas.length && (!!tie.participanteUmId !== !!tie.participanteDoisId);
      const visibleTies = ties.filter(tie => !automatic(tie));
      const visibleIds = new Set(visibleTies.map(tie => tie.id));
      const labels = new Map<number, string>();
      groups.forEach((group, stage) => {
        const visible = group.filter(tie => !automatic(tie));
        visible.forEach((tie, index) => {
          const name = tie.etapa?.nome || rounds[stage]?.etapa?.nome || (group.length === 1 ? "Final" : `Etapa ${stage+1}`);
          const shortName = ({ "Quartas de final": "Quartas", "Semifinal": "Semi", "Oitavas de final": "Oitavas", "Fase preliminar": "Preliminar" } as Record<string, string>)[name] || name;
          labels.set(tie.id, group.length === 1 ? shortName : `${shortName} ${index+1}`);
        });
      });
      const tiesById = new Map(ties.map(tie => [tie.id, tie]));
      const resolvedParticipant = (id: number | null, origin: number | null) => {
        if (id != null) return id;
        const source = origin == null ? undefined : tiesById.get(origin);
        if (!source) return null;
        if (automatic(source)) return source.participanteUmId ?? source.participanteDoisId;
        return winner(source.partidas[0])?.id ?? null;
      };
      const columns = Math.max(1, rounds.length*2-1);
      const height = Math.max(300, (groups[0]?.length || 2)/2*146+100);
      const positions = new Map<number, {x:number;y:number}>();
      groups.forEach((group, stage) => group.forEach((tie, index) => {
        const right = index >= group.length/2 && group.length > 1;
        const x = (group.length === 1 ? rounds.length-1 : right ? columns-stage-1 : stage)*260+12;
        const parents = [tie.origemUmId, tie.origemDoisId].map(id=>id == null ? undefined : positions.get(id)).filter((p): p is {x:number;y:number}=>!!p);
        const y = parents.length ? parents.reduce((n,p)=>n+p.y,0)/parents.length : 80+(index % Math.max(1,group.length/2))*146;
        positions.set(tie.id,{x,y});
      }));
      const occupiedColumns = [...new Set(visibleTies.map(tie => positions.get(tie.id)!.x))].sort((a,b) => a-b);
      const width = Math.max(1, occupiedColumns.length)*260;
      visibleTies.forEach(tie => {
        const position = positions.get(tie.id)!;
        positions.set(tie.id, { ...position, x: occupiedColumns.indexOf(position.x)*260+12 });
      });
      const finalTie = groups.at(-1)?.[0];
      const champion = !editable ? winner(finalTie?.partidas[0]) : null;
      return <div key={phase.id}>
        {champion && <div className={styles.champion}><span aria-hidden="true">★</span><Logo participant={champion}/><div><small>CAMPEÃO DO CAMPEONATO</small><strong>{champion.jogador.apelido || champion.jogador.nome}</strong></div></div>}
        {!ties.length ? <p className="form-note">Chaveamento indisponível. Atualize o campeonato para carregar os confrontos.</p> : <div className={styles.scroll} tabIndex={0} role="region" aria-label="Chaveamento completo do campeonato"><div className={styles.bracket} style={{width,height}}>
          <svg width={width} height={height} className={styles.lines} aria-hidden="true">{visibleTies.flatMap(tie=>[tie.origemUmId,tie.origemDoisId].map(id=> {
            if (id == null || !visibleIds.has(id)) return null;
            const parent = id == null ? undefined : positions.get(id); const child = positions.get(tie.id);
            if(!parent || !child) return null;
            const right = parent.x > child.x; const x1=parent.x+(right?0:236); const x2=child.x+(right?236:0); const y1=parent.y+52; const y2=child.y+52; const middle=(x1+x2)/2;
            return <path key={`${tie.id}-${id}`} d={`M ${x1} ${y1} H ${middle} V ${y2} H ${x2}`}/>;
          }))}</svg>
          {groups.map((group,stage)=><div key={stage}>{group.map((tie,index)=> {
            if (automatic(tie)) return null;
            const point=positions.get(tie.id)!; const match=tie.partidas[0]; const round=rounds[stage]; const victorious=winner(match);
            const playable=editable && round.status === "EM_ANDAMENTO" && !!match;
            const sides=[resolvedParticipant(tie.participanteUmId, tie.origemUmId),resolvedParticipant(tie.participanteDoisId, tie.origemDoisId)];
            return <div key={tie.id}>
              {!group.slice(0,index).some(previous => visibleIds.has(previous.id) && positions.get(previous.id)?.x === point.x) && <h3 className={styles.stage} style={{left:point.x,top:22}}>{tie.etapa?.nome || round.etapa?.nome || (group.length===1?"Final":`Etapa ${stage+1}`)}</h3>}
              <button type="button" className={styles.match} style={{left:point.x,top:point.y}} disabled={!playable} onClick={()=>{if(playable)setSelected(match)}} aria-label={`${labels.get(tie.id)}${playable?": adicionar ou editar placar":""}`} data-final={group.length===1}>
                <span className={styles.meta}><span>{labels.get(tie.id)}</span><span>{match?.status === "FINALIZADA" ? "Finalizado" : playable ? "Em disputa" : !tie.origemUmId && !tie.participanteDoisId ? "Classificado" : "A definir"}</span></span>
                {sides.map((id,side)=> {
                  const participant=championship.participantes.find(p=>p.id===id);
                  const origin=side===0?tie.origemUmId:tie.origemDoisId;
                  return <span key={side} className={styles.player} data-winner={participant && victorious?.id===participant.id}>
                    {participant?<><Logo participant={participant}/><span className={styles.name}>{participant.jogador.apelido || participant.jogador.nome}</span></>:<span className={styles.placeholder}>{origin?`Vencedor de ${labels.get(origin) || "etapa anterior"}`:"Avanço automático"}</span>}
                    <b>{match?.resultado ? side===0?match.resultado.golsMandante:match.resultado.golsVisitante : "–"}</b>
                    {match?.resultado?.penaltisMandante != null && <small title="Pênaltis">({side===0?match.resultado.penaltisMandante:match.resultado.penaltisVisitante})</small>}
                  </span>;
                })}
              </button>
            </div>;
          })}</div>)}
        </div></div>}
      </div>;
    })}
    {selected && <MatchResultDialog key={selected.id} championshipId={championship.id} match={selected} knockout onClose={()=>setSelected(null)} onSaved={onUpdated}/>}
  </section>;
}
