"use client";

import { useLayoutTransition } from "../../components/use-layout-transition";
import { createBracketCaptureClone } from "./bracket-capture";
import { knockoutParticipantCount, knockoutTies } from "./knockout-ties";
import { useRef, useState } from "react";
import Image from "next/image";
import { validYoutubeUrl } from "../../components/youtube-url";
import { useAdminPermission } from "../../components/use-admin-permission";
import { canOptimizeTeamLogo } from "../../equipes/logo-sources";
import type { Championship, Participant } from "../novo/championship-form";
import type { KnockoutTie, SchedulePhase } from "./championship-schedule";
import ChampionshipScorers from "./championship-scorers";
import { topScorers } from "./provisional-standings";
import MatchResultDialog from "./match-result-dialog";
import styles from "./knockout-bracket.module.css";
import { winner as tieWinner } from "./knockout-winner";
import LineBracket from "./line-bracket";
import { lineBracketLayout } from "./line-bracket-layout";

type Match = SchedulePhase["rodadas"][number]["partidas"][number];
const cardHeight = 140;
const legSpacing = cardHeight + 12;
const columnSpacing = 288;
const zoomLevels = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
const missingLogo = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const legCount = (tie: KnockoutTie) => Math.max(tie.partidas.length, tie.tipo === "IDA_E_VOLTA" ? 2 : 1);
const thirdPlace = (tie: KnockoutTie) => tie.terceiroLugar || tie.etapa?.codigo === "TERCEIRO_LUGAR";

function Logo({ participant }: { participant: Participant }) {
  const url = participant.equipe.logoUrl?.trim();
  const [failed, setFailed] = useState<string | null>(null);
  const [failedOptimization, setFailedOptimization] = useState<string | null>(null);
  const optimize = !!url && failedOptimization !== url && canOptimizeTeamLogo(url);
  return <span className={styles.logo}>{url && failed !== url && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) ?
    <Image src={url} alt={participant.equipe.nome} width={28} height={28} unoptimized={!optimize} onError={() => {
      if (optimize) setFailedOptimization(url);
      else setFailed(url);
    }} /> : participant.equipe.nome.slice(0, 2).toUpperCase()}</span>;
}
export default function KnockoutBracket({ championship, onUpdated, embedded = false, readOnly = false }: { readOnly?: boolean; embedded?: boolean; championship: Championship; onUpdated: (updated: Championship) => void }) {
  const adminPermission = useAdminPermission(!readOnly);
  const isAdmin = !readOnly && adminPermission;
  const motion = useLayoutTransition(JSON.stringify([championship.fases, championship.participantesDesistentes]));
  const winner = (tie?: KnockoutTie) => tieWinner(tie, championship.participantesDesistentes);
  const [twoSided, setTwoSided] = useState(false);
  const [layoutStyle, setLayoutStyle] = useState<"cards" | "lines">("cards");
  const [view, setView] = useState<"bracket" | "scorers">("bracket");
  const [selected, setSelected] = useState<Match | null>(null);
  const [zoomIndex, setZoomIndex] = useState(zoomLevels.indexOf(100));
  const brackets = useRef(new Map<number, HTMLDivElement>());
  const [exporting, setExporting] = useState<number | null>(null);
  const [exportError, setExportError] = useState<number | null>(null);
  const zoom = zoomLevels[zoomIndex];
  const phases = championship.fases?.filter(phase => phase.tipo === "ELIMINATORIA") || [];
  const allRounds = championship.fases?.flatMap(phase => phase.rodadas) || [];
  const final = championship.status === "FINALIZADO";
  const leaders = topScorers(allRounds, championship.participantes).filter(row => row.position === 1 && row.goalsFor > 0);
  const selectedTie = selected ? phases.flatMap(phase => knockoutTies(phase)).find(tie => tie.partidas.some(match => match.id === selected.id)) : undefined;
  const decidingLeg = !!selectedTie && selectedTie.partidas.at(-1)?.id === selected?.id && selectedTie.partidas.length >= legCount(selectedTie);
  const aggregateDifference = selected ? (selectedTie?.partidas.filter(match => match.id !== selected.id).reduce((sum, match) => sum + (match.resultado ? (match.mandante.id === selected.mandante.id ? 1 : -1) * (match.resultado.golsMandante - match.resultado.golsVisitante) : 0), 0) || 0) : 0;
  const editable = !readOnly && championship.status === "EM_ANDAMENTO";

  async function downloadBracket(phaseId: number, width: number, height: number) {
    const bracket = brackets.current.get(phaseId);
    if (!bracket || exporting !== null) return;
    setExporting(phaseId);
    setExportError(null);
    let captureHost: HTMLDivElement | undefined;
    try {
      const { toCanvas } = await import("html-to-image");
      const colors = getComputedStyle(bracket);
      const backgroundColor = colors.getPropertyValue("--panel").trim();
      const captureClone = createBracketCaptureClone(bracket);
      captureHost = document.createElement("div");
      captureHost.setAttribute("aria-hidden", "true");
      Object.assign(captureHost.style, { position: "fixed", left: "-100000px", top: "0", pointerEvents: "none" });
      captureHost.appendChild(captureClone);
      document.body.appendChild(captureHost);
      const bracketImage = await toCanvas(captureClone, {
        width,
        height,
        pixelRatio: 2,
        style: { zoom: "1", margin: "0" },
        backgroundColor,
        imagePlaceholder: missingLogo,
        skipFonts: true,
        includeQueryParams: true,
      });
      const scale = bracketImage.width / width;
      const headerHeight = Math.round(76 * scale);
      const image = document.createElement("canvas");
      image.width = Math.max(bracketImage.width, Math.round(440 * scale));
      image.height = bracketImage.height + headerHeight;
      const context = image.getContext("2d");
      if (!context) throw new Error("Falha ao preparar a imagem.");
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, image.width, image.height);
      context.drawImage(bracketImage, (image.width - bracketImage.width) / 2, headerHeight);
      context.fillStyle = colors.getPropertyValue("--gold").trim();
      context.font = `bold ${28 * scale}px Arial, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      const organization = championship.organizacao.nome.trim();
      const title = /^Campeonato\b/i.test(organization) ? organization : `Campeonato ${organization}`;
      context.fillText(
        `${title} ${championship.edicao}ª Edição`,
        image.width / 2,
        headerHeight / 2,
        image.width - 40 * scale,
      );
      const blob = await new Promise<Blob | null>(resolve => image.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Falha ao gerar a imagem.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `chaveamento-${championship.id}-${phaseId}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError(phaseId);
    } finally {
      captureHost?.remove();
      setExporting(null);
    }
  }

  return <section ref={motion} aria-labelledby="knockout-title" className={styles.panel}>
    {!embedded && <div className="schedule-view-options" role="group" aria-label="Visualização do campeonato"><button type="button" aria-pressed={view === "bracket"} onClick={() => setView("bracket")}>Mata a mata</button><button type="button" aria-pressed={view === "scorers"} onClick={() => setView("scorers")}>Artilheiro</button></div>}
    <header className={styles.heading}><div><p className="eyebrow">O CAMINHO ATÉ A TAÇA</p><h2 id="knockout-title">{view === "bracket" ? "Mata a mata" : "Artilheiro"}</h2><p>{view === "bracket" ? "Confira os confrontos de cada etapa até a final" : "Os jogadores que mais balançaram a rede"}</p></div><span className={styles.badge}>ELIMINATÓRIO</span></header>
    {view === "scorers" ? <ChampionshipScorers rounds={allRounds} participants={championship.participantes} final={final} /> : <>
    <p className={styles.hint}>{readOnly ? "Acompanhe os resultados e avanços ao vivo. Use as opções para escolher a visualização." : editable ? "Selecione uma partida da etapa em andamento para registrar o placar. A próxima etapa é liberada ao concluir todos os jogos." : "Campeonato finalizado. Confira o caminho do campeão."} Arraste a barra horizontal para explorar o chaveamento.</p>
    {phases.map(phase => {
      const rounds = [...phase.rodadas].sort((a,b) => a.numero-b.numero);
      const ties = knockoutTies(phase);
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
      let width = Math.max(1, occupiedColumns.length)*columnSpacing;
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
      if (layoutStyle !== "cards") {
        const lineLayout = lineBracketLayout(phase, championship.participantes, !!championship.organizacao.trofeuUrl, twoSided, championship.participantesDesistentes);
        width = lineLayout.width;
        height = lineLayout.height;
      }
      const champion = final ? winner(finalTie) : null;
      return <div key={phase.id}>
        {champion && <div className={styles.champion}><span aria-hidden="true">★</span><Logo participant={champion}/><div><small>CAMPEÃO DO CAMPEONATO</small><strong>{champion.jogador.apelido || champion.jogador.nome}</strong></div></div>}
        {champion && final && leaders.map(row => <div key={row.participant.id} className={`${styles.champion} ${styles.scorer}`}><span aria-hidden="true">⚽</span><Logo participant={row.participant}/><div><small>ARTILHEIRO DO CAMPEONATO</small><strong>{row.participant.jogador.apelido || row.participant.jogador.nome}</strong><span>{row.goalsFor} {row.goalsFor === 1 ? "gol" : "gols"}</span></div></div>)}
        {!ties.length ? <p className="form-note">Chaveamento indisponível. Atualize o campeonato para carregar os confrontos.</p> : <div className={styles.frame}>
          <div className={styles.toolbar}>
          <button className={styles.capture} type="button" disabled={exporting !== null} onClick={() => void downloadBracket(phase.id, width, height)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 7h4l2-3h6l2 3h4v13H3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            {exporting === phase.id ? "Gerando imagem…" : "Baixar print"}
          </button>
          <div className={styles.layoutOptions} role="group" aria-label="Estilo do chaveamento">
            <button type="button" aria-pressed={layoutStyle === "cards"} onClick={() => setLayoutStyle("cards")}>Cards</button>
            <button type="button" aria-pressed={layoutStyle === "lines"} onClick={() => setLayoutStyle("lines")}>Linhas</button>
          </div>
          {layoutStyle === "lines" && knockoutParticipantCount(phase, championship.participantes.length) <= 8 && <div className={styles.layoutOptions} role="group" aria-label="Distribuição do chaveamento">
            <button type="button" aria-pressed={!twoSided} onClick={() => setTwoSided(false)}>Somente à esquerda</button>
            <button type="button" aria-pressed={twoSided} onClick={() => setTwoSided(true)}>Dois lados</button>
          </div>}
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
          </div>
          {exportError === phase.id && <p className={styles.captureError} role="alert">Não foi possível baixar a imagem. Tente novamente.</p>}
          <div className={styles.scroll} tabIndex={0} role="region" aria-label="Chaveamento completo do campeonato"><div className={styles.bracket} style={{ width, height, zoom: zoom / 100 }} ref={node => {
            if (node) brackets.current.set(phase.id, node);
            else brackets.current.delete(phase.id);
          }}>
          {layoutStyle !== "cards" ? <LineBracket withdrawn={championship.participantesDesistentes} twoSided={twoSided} organization={championship.organizacao} phase={phase} participants={championship.participantes} editable={editable} isAdmin={isAdmin} onSelect={setSelected} Logo={Logo} /> : <>
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
                const playable = !!match && !match.wo && ((editable && round?.status === "EM_ANDAMENTO") || (isAdmin && !!match.resultado));
                const label = legCount(tie) === 1 ? labels.get(tie.id) : `${labels.get(tie.id)} · ${leg === 0 ? "Ida" : "Volta"}`;
                const players = match ? [match.mandante.id, match.visitante.id] : leg === 0 ? sides : [...sides].reverse();
                const video = match?.youtubeUrl && validYoutubeUrl(match.youtubeUrl) ? match.youtubeUrl : null;
                return <div key={leg} data-motion-key={`match-${phase.id}-${tie.id}-${leg}`} data-motion-value={JSON.stringify([match?.mandante.id, match?.visitante.id, match?.resultado, victorious?.id])} className={styles.match} style={{left:point.x,top:point.y + leg * legSpacing}} data-final={tie === finalTie}>
                <button type="button" className={styles.matchBody} disabled={!playable && !video} onClick={() => { if (video) window.open(video, "_blank", "noopener,noreferrer"); else if (playable) setSelected(match); }} aria-label={video ? `Assistir partida · ${label}` : playable ? `${label}: adicionar ou editar placar e vídeo` : undefined}>
                <span className={styles.meta}><span>{label}</span><span>{match?.wo ? "W.O." : match?.status === "FINALIZADA" ? "Finalizado" : playable ? "Em disputa" : "A definir"}</span></span>
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
                </button>
                <div className={styles.matchFooter}>
                  {video && <a href={video} target="_blank" rel="noopener noreferrer" title={video}>▶ Assistir partida</a>}
                  {video && playable && <button type="button" onClick={() => setSelected(match)}>Editar</button>}
                </div>
                </div>;
              })}
            </div>;
          })}</div>)}
          </>}
        </div></div></div>}
      </div>;
    })}
    </>}
    {selected && <MatchResultDialog key={selected.id} championshipId={championship.id} match={selected} knockout={decidingLeg} aggregateDifference={aggregateDifference} onClose={()=>setSelected(null)} onSaved={onUpdated}/>}
  </section>;
}
