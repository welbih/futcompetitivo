"use client";
import { teamLogoSource } from "../../equipes/logo-sources";


import { useLayoutTransition } from "../../components/use-layout-transition";
import { useRef, useState } from "react";
import { downloadStandings } from "./standings-capture";
import Image from "next/image";
import styles from "./championship-standings.module.css";
import type { Participant } from "../novo/championship-form";
import type { SchedulePhase } from "./championship-schedule";
import { classificationRows, type OfficialClassification } from "./provisional-standings";

function StandingLogo({ team }: { team: Participant["equipe"] }) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = team.logoUrl?.trim();
  const valid = !!url && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url));
  return <span className={styles.logo} title={team.nome}>{valid && failed !== url ? <Image src={teamLogoSource(url)} alt={`Logo de ${team.nome}`} width={32} height={32} unoptimized onError={() => setFailed(url)} /> : <span role="img" aria-label={`Equipe ${team.nome}`}>{team.nome.slice(0, 2).toUpperCase()}</span>}</span>;
}
export default function ChampionshipStandings({ captureTitle = "Tabela de classificação", withdrawn = [], rounds, participants, official, final = false, league = false, qualifiedCount, stageComplete = false, stageName = "Fase de liga", qualificationByParticipant, qualificationConfirmed = false }: { captureTitle?: string; withdrawn?: number[]; qualificationByParticipant?: Record<number, "qualified" | "extra">; qualificationConfirmed?: boolean; stageName?: string; qualifiedCount?: number; stageComplete?: boolean; rounds: SchedulePhase["rodadas"]; participants: Participant[]; official?: OfficialClassification; final?: boolean; league?: boolean }) {
  const capture = useRef<HTMLElement>(null);
  const captureLock = useRef(false);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const rows = classificationRows(rounds, participants, official);
  const motion = useLayoutTransition(JSON.stringify(rows.map(row => [row.participant.id, row.position, row.points, row.goalsFor, row.goalsAgainst])));
  const eligibleIds = rows.filter(row => !withdrawn.includes(row.participant.id)).map(row => row.participant.id);
  const bracketSize = qualifiedCount ? 2 ** Math.ceil(Math.log2(qualifiedCount)) : 0;
  const directCount = qualifiedCount ? (bracketSize === qualifiedCount ? qualifiedCount : bracketSize - qualifiedCount) : 0;
  return <article ref={capture} className={styles.card}>
    <div className={styles.captureToolbar} data-capture-ignore><button type="button" className={styles.captureButton} disabled={capturing} onClick={async () => {
      if (!capture.current || captureLock.current) return;
      captureLock.current = true; setCapturing(true); setCaptureError("");
      try { await downloadStandings(capture.current, captureTitle); }
      catch { setCaptureError("Não foi possível baixar o print. Tente novamente."); }
      finally { captureLock.current = false; setCapturing(false); }
    }}>{capturing ? "Gerando print…" : "↓ Print da classificação"}</button></div>
    {captureError && <p className={styles.description} role="alert" data-capture-ignore>{captureError}</p>}
    <header className={styles.header}><h3>Tabela de classificação</h3><span className={styles.badge}>{stageComplete ? `${stageName} finalizada` : final ? "Final" : official?.parcial ? "Parcial · ao vivo" : official ? "Oficial" : "Provisória"}</span></header>
    <p className={styles.description}>Resultados acumulados até esta rodada. Vitória: 3 pontos · Empate: 1 ponto. {stageComplete ? `${stageName} finalizada.` : final ? "Campeonato finalizado." : official?.parcial ? "Inclui os resultados finalizados da rodada em andamento." : official ? "Rodada finalizada." : "A rodada permanece em andamento."}</p>
    {qualifiedCount != null && <div className={styles.qualificationLegend}><span className={styles.directKey}>Verde · {directCount} vaga(s) sem preliminar</span>{qualifiedCount > directCount && <span className={styles.preliminaryKey}>Azul · {qualifiedCount-directCount} vaga(s) na preliminar</span>}<span>{stageComplete && !withdrawn.length ? "Classificados pela ordem oficial da liga." : "Faixas provisórias; classificação confirmada ao encerrar a liga."}</span></div>}
    {qualificationByParticipant && <div className={styles.qualificationLegend}><span className={styles.directKey}>Verde · {qualificationConfirmed ? "Classificado para o mata a mata" : "Na zona de classificação"}</span>{Object.values(qualificationByParticipant).includes("extra") && <span className={styles.preliminaryKey}>Azul · Disputa pela vaga extra</span>}{!qualificationConfirmed && <span>Provisório: vagas confirmadas pela API ao encerrar os grupos.</span>}</div>}
    {withdrawn.length > 0 && <p className={styles.description}>Vermelho: participante desistente. A zona provisória considera os próximos elegíveis; a confirmação ou substituição da vaga depende do admin e da API.</p>}
    <p className={styles.scrollHint} data-capture-ignore>Deslize a tabela para ver todas as estatísticas. O jogador permanece visível.</p>
    <div ref={motion} data-standings-scroll className={styles.scroll} tabIndex={0} role="region" aria-label="Tabela de classificação com rolagem horizontal"><table className={styles.table}>
      <caption className="sr-only">Classificação por pontos, vitórias, saldo de gols e gols marcados.</caption>
      <thead><tr><th scope="col" title="Movimentação em relação à rodada anterior">Mov.</th><th scope="col">Pos.</th><th scope="col">Jogador / Equipe</th><th scope="col" title="Pontos">PTS</th><th scope="col" title="Jogos">J</th><th scope="col" title="Vitórias">V</th><th scope="col" title="Empates">E</th><th scope="col" title="Derrotas">D</th><th scope="col" title="Gols marcados">GP</th><th scope="col" title="Gols sofridos">GC</th><th scope="col" title="Saldo de gols">SG</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.participant.id} data-motion-key={`player-${row.participant.id}`} data-motion-value={`${row.position}-${row.points}-${row.goalsFor}-${row.goalsAgainst}`} data-withdrawn={withdrawn.includes(row.participant.id)} data-qualification={withdrawn.includes(row.participant.id) ? undefined : qualificationByParticipant?.[row.participant.id] ?? (qualifiedCount != null && eligibleIds.indexOf(row.participant.id) < qualifiedCount ? eligibleIds.indexOf(row.participant.id) < directCount ? "direct" : "preliminary" : undefined)} className={final && league && official && row.position === 1 ? styles.champion : undefined}><td className={styles.movement} data-movement={row.movement} title={row.movement === "up" ? `Subiu ${row.variation} posição(ões)` : row.movement === "down" ? `Desceu ${Math.abs(row.variation)} posição(ões)` : "Manteve a posição"} aria-label={row.movement === "up" ? `Subiu ${row.variation} posição(ões)` : row.movement === "down" ? `Desceu ${Math.abs(row.variation)} posição(ões)` : "Manteve a posição"}><span aria-hidden="true">{row.movement === "up" ? `↑ ${Math.abs(row.variation)}` : row.movement === "down" ? `↓ ${Math.abs(row.variation)}` : "−"}</span></td><td className={styles.position}>{row.position}º</td><th scope="row"><span className={styles.identity}><StandingLogo team={row.participant.equipe} /><span>{row.participant.jogador.apelido?.trim() || row.participant.jogador.nome}{withdrawn.includes(row.participant.id) && <small className={styles.withdrawnLabel}>Desistente</small>}{final && league && official && row.position === 1 && <small className={styles.championLabel}>★ Campeão</small>}</span></span></th><td className={styles.points}>{row.points}</td><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.goalsFor}</td><td>{row.goalsAgainst}</td><td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td></tr>)}</tbody>
    </table></div>
    <p className={styles.note}>↑ Subiu · ↓ Desceu · − Manteve, em relação à rodada anterior. Na primeira rodada, todos mantêm a posição. Desempates: pontos, vitórias, saldo de gols e gols marcados. {official ? "Ordem oficial e desempates confirmados pela API." : "Empates nesses critérios mantêm a mesma posição provisória; o sorteio oficial ocorre ao finalizar a rodada."}</p>
  </article>;
}





