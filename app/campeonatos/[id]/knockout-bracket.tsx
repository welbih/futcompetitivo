"use client";

import { useState } from "react";
import Image from "next/image";
import type { Championship, Participant } from "../novo/championship-form";
import type { KnockoutTie, SchedulePhase } from "./championship-schedule";
import ChampionshipScorers from "./championship-scorers";
import { topScorers } from "./provisional-standings";
import MatchResultDialog from "./match-result-dialog";
import styles from "./knockout-bracket.module.css";

type Match = SchedulePhase["rodadas"][number]["partidas"][number];
const cardHeight = 110;
const legSpacing = cardHeight + 12;
const columnSpacing = 288;
const zoomLevels = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
const legCount = (tie: KnockoutTie) => Math.max(tie.partidas.length, tie.tipo === "IDA_E_VOLTA" ? 2 : 1);
const thirdPlace = (tie: KnockoutTie) => tie.terceiroLugar || tie.etapa?.codigo === "TERCEIRO_LUGAR";

function winner(tie?: KnockoutTie) {
  if (!tie || tie.partidas.length !== legCount(tie)) return null;
  const first = tie.partidas[0];
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
function Logo({ participant }: { participant: Participant }) {
  const url = participant.equipe.logoUrl?.trim();
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={styles.logo}>{url && failed !== url && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) ? <Image src={url} alt={participant.equipe.nome} width={28} height={28} unoptimized onError={() => setFailed(url)} /> : participant.equipe.nome.slice(0, 2).toUpperCase()}</span>;
}
export default function KnockoutBracket({ championship, onUpdated, embedded = false }: { embedded?: boolean; championship: Championship; onUpdated: (updated: Championship) => void }) {
  const [view, setView] = useState<"bracket" | "scorers">("bracket");
  const [selected, setSelected] = useState<Match | null>(null);
  const [zoomIndex, setZoomIndex] = useState(zoomLevels.indexOf(100));
  const zoom = zoomLevels[zoomIndex];
  const phases = championship.fases?.filter(phase => phase.tipo === "ELIMINATORIA") || [];
  const allRounds = championship.fases?.flatMap(phase => phase.rodadas) || [];
  const final = championship.status === "FINALIZADO";
  const leaders = topScorers(allRounds, championship.participantes).filter(row => row.position === 1 && row.goalsFor > 0);
  const editable = championship.status === "EM_ANDAMENTO";
  return <section aria-labelledby="knockout-title" className={styles.panel}>
    {!embedded && <div className="schedule-view-options" role="group" aria-label="Visualização do campeonato"><button type="button" aria-pressed={view === "bracket"} onClick={() => setView("bracket")}>Mata a mata</button><button type="button" aria-pressed={view === "scorers"} onClick={() => setView("scorers")}>Artilheiro</button></div>}
    <header className={styles.heading}><div><p className="eyebrow">O CAMINHO ATÉ A TAÇA</p><h2 id="knockout-title">{view === "bracket" ? "Mata a mata" : "Artilheiro"}</h2><p>{view === "bracket" ? "Confira os confrontos de cada etapa até a final" : "Os jogadores que mais balançaram a rede"}</p></div><span className={styles.badge}>ELIMINATÓRIO</span></header>
    {view === "scorers" ? <ChampionshipScorers rounds={allRounds} participants={championship.participantes} final={final} /> : <>
    <p className={styles.hint}>{editable ? "Selecione uma partida da etapa em andamento para registrar o placar. A próxima etapa é liberada ao concluir todos os jogos." : "Campeonato finalizado. Confira o caminho do campeão."} Arraste a barra horizontal para explorar o chaveamento.</p>
    {phases.map(phase => {
      const rounds = [...phase.rodadas].sort((a,b) => a.numero-b.numero);
      const ties = phase.confrontos || [];
      const bracketTies = ties.filter(tie => !thirdPlace(tie));
      const thirdPlaceTies = ties.filter(thirdPlace);
      const groups: KnockoutTie[][] = []; let offset = 0;
      for (let i=0; i<rounds.length; i++) { const count = 2 ** (rounds.length-i-1); groups.push(bracketTies.slice(offset,offset+count)); offset += count; }
      const finalTie = groups.at(-1)?.[0];
      const automatic = (tie: KnockoutTie) => !tie.origemUmId && !tie.origemDoisId && !tie.partidas.length && (!!tie.participanteUmId !== !!tie.participanteDoisId);
      const visibleTies = groups.flat().filter(tie => !automatic(tie));
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
        return winner(source)?.id ?? null;
      };
      const columns = Math.max(1, rounds.length*2-1);
      const rowSpacing = Math.max(1, ...visibleTies.map(legCount)) * legSpacing + 40;
      const positions = new Map<number, {x:number;y:number}>();
      groups.forEach((group, stage) => group.forEach((tie, index) => {
        const right = index >= group.length/2 && group.length > 1;
        const x = (group.length === 1 ? rounds.length-1 : right ? columns-stage-1 : stage)*columnSpacing+26;
        const parents = [tie.origemUmId, tie.origemDoisId].map(id=>id == null ? undefined : positions.get(id)).filter((p): p is {x:number;y:number}=>!!p);
        const y = parents.length ? parents.reduce((n,p)=>n+p.y,0)/parents.length : 80+(index % Math.max(1,group.length/2))*rowSpacing;
        positions.set(tie.id,{x,y});
      }));
      const occupiedColumns = [...new Set(visibleTies.map(tie => positions.get(tie.id)!.x))].sort((a,b) => a-b);
      const width = Math.max(1, occupiedColumns.length)*columnSpacing;
      visibleTies.forEach(tie => {
        const position = positions.get(tie.id)!;
        positions.set(tie.id, { ...position, x: occupiedColumns.indexOf(position.x)*columnSpacing+26 });
      });
      let height = Math.max(240, ...visibleTies.map(tie => positions.get(tie.id)!.y + legCount(tie) * legSpacing + 24));
      for (const tie of thirdPlaceTies) {
        positions.set(tie.id, { x: finalTie ? positions.get(finalTie.id)!.x : 26, y: height + 48 });
        height += 48 + legCount(tie) * legSpacing + 24;
        labels.set(tie.id, tie.etapa?.nome || "Disputa de terceiro lugar");
      }
      const champion = !editable ? winner(finalTie) : null;
      return <div key={phase.id}>
        {champion && <div className={styles.champion}><span aria-hidden="true">★</span><Logo participant={champion}/><div><small>CAMPEÃO DO CAMPEONATO</small><strong>{champion.jogador.apelido || champion.jogador.nome}</strong></div></div>}
        {champion && final && leaders.map(row => <div key={row.participant.id} className={`${styles.champion} ${styles.scorer}`}><span aria-hidden="true">⚽</span><Logo participant={row.participant}/><div><small>ARTILHEIRO DO CAMPEONATO</small><strong>{row.participant.jogador.apelido || row.participant.jogador.nome}</strong><span>{row.goalsFor} {row.goalsFor === 1 ? "gol" : "gols"}</span></div></div>)}
        {!ties.length ? <p className="form-note">Chaveamento indisponível. Atualize o campeonato para carregar os confrontos.</p> : <div className={styles.frame}>
          <div className={styles.zoomControls} role="group" aria-label="Zoom do chaveamento">
            {[-1, 1].map(step => {
              const label = step < 0 ? "Diminuir zoom" : "Aumentar zoom";
              return <button key={step} type="button" aria-label={label} title={label}
                disabled={zoomIndex + step < 0 || zoomIndex + step >= zoomLevels.length}
                onClick={() => setZoomIndex(index => Math.max(0, Math.min(zoomLevels.length - 1, index + step)))}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10" cy="10" r="6" />
                  <path d="m14.5 14.5 5 5M7 10h6" />
                  {step > 0 && <path d="M10 7v6" />}
                </svg>
              </button>;
            })}
            <output aria-label="Nível de zoom">{zoom}%</output>
          </div>
          <div className={styles.scroll} tabIndex={0} role="region" aria-label="Chaveamento completo do campeonato"><div className={styles.bracket} style={{ width, height, zoom: zoom / 100 }}>
          <svg width={width} height={height} className={styles.lines} aria-hidden="true">{visibleTies.flatMap(tie=>[tie.origemUmId,tie.origemDoisId].map(id=> {
            if (id == null || !visibleIds.has(id)) return null;
            const parent = id == null ? undefined : positions.get(id); const child = positions.get(tie.id);
            if(!parent || !child) return null;
            const right = parent.x > child.x; const x1=parent.x+(right?0:236); const x2=child.x+(right?236:0); const y1=parent.y+52; const y2=child.y+52; const middle=(x1+x2)/2;
            return <path key={`${tie.id}-${id}`} d={`M ${x1} ${y1} H ${middle} V ${y2} H ${x2}`}/>;
          }))}</svg>
          {[...groups, thirdPlaceTies].map((group,stage)=><div key={stage}>{group.map((tie,index)=> {
            if (automatic(tie)) return null;
            const bronze = thirdPlace(tie);
            const point = positions.get(tie.id)!;
            const round = bronze ? rounds.at(-1) : rounds[stage];
            const victorious = winner(tie);
            const sides = bronze ? [tie.participanteUmId, tie.participanteDoisId] : [
              resolvedParticipant(tie.participanteUmId, tie.origemUmId),
              resolvedParticipant(tie.participanteDoisId, tie.origemDoisId),
            ];
            return <div key={tie.id}>
              {(bronze || !group.slice(0,index).some(previous => visibleIds.has(previous.id) && positions.get(previous.id)?.x === point.x)) && <h3 className={styles.stage} style={{left:point.x,top:bronze ? point.y - 40 : 22}}>{bronze ? labels.get(tie.id) : tie.etapa?.nome || round?.etapa?.nome || (tie === finalTie ? "Final" : `Etapa ${stage+1}`)}</h3>}
              {Array.from({ length: legCount(tie) }, (_, leg) => {
                const match = tie.partidas[leg];
                const playable = editable && round?.status === "EM_ANDAMENTO" && !!match;
                const label = legCount(tie) === 1 ? labels.get(tie.id) : `${labels.get(tie.id)} · ${leg === 0 ? "Ida" : "Volta"}`;
                const players = match ? [match.mandante.id, match.visitante.id] : leg === 0 ? sides : [...sides].reverse();
                return <button key={leg} type="button" className={styles.match} style={{left:point.x,top:point.y + leg * legSpacing}} disabled={!playable} onClick={()=>{if(playable)setSelected(match)}} aria-label={playable ? `${label}: adicionar ou editar placar` : undefined} data-final={tie === finalTie}>
                <span className={styles.meta}><span>{label}</span><span>{match?.status === "FINALIZADA" ? "Finalizado" : playable ? "Em disputa" : "A definir"}</span></span>
                {players.map((id,side)=> {
                  const participant=championship.participantes.find(p=>p.id===id);
                  const origin=(side === leg) ? tie.origemUmId : tie.origemDoisId;
                  return <span key={side} className={styles.player}
                    data-winner={participant && victorious?.id === participant.id}
                    data-eliminated={!!participant && !!victorious && victorious.id !== participant.id}>
                    {participant?<><Logo participant={participant}/><span className={styles.name}>{participant.jogador.apelido || participant.jogador.nome}</span></>:<span className={styles.placeholder}>{origin?`${bronze ? "Perdedor" : "Vencedor"} de ${labels.get(origin) || "etapa anterior"}`:"Avanço automático"}</span>}
                    <b>{match?.resultado ? side===0?match.resultado.golsMandante:match.resultado.golsVisitante : "–"}</b>
                    {match?.resultado?.penaltisMandante != null && <small title="Pênaltis">({side===0?match.resultado.penaltisMandante:match.resultado.penaltisVisitante})</small>}
                  </span>;
                })}
                </button>;
              })}
            </div>;
          })}</div>)}
        </div></div></div>}
      </div>;
    })}
    </>}
    {selected && <MatchResultDialog key={selected.id} championshipId={championship.id} match={selected} knockout onClose={()=>setSelected(null)} onSaved={onUpdated}/>}
  </section>;
}
