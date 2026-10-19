"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./championship-standings.module.css";
import type { Participant } from "../novo/championship-form";
import type { SchedulePhase } from "./championship-schedule";
import { classificationRows, type OfficialClassification } from "./provisional-standings";

function StandingLogo({ team }: { team: Participant["equipe"] }) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = team.logoUrl?.trim();
  const valid = !!url && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url));
  return <span className={styles.logo} title={team.nome}>{valid && failed !== url ? <Image src={url} alt={`Logo de ${team.nome}`} width={32} height={32} unoptimized onError={() => setFailed(url)} /> : <span role="img" aria-label={`Equipe ${team.nome}`}>{team.nome.slice(0, 2).toUpperCase()}</span>}</span>;
}
export default function ChampionshipStandings({ rounds, participants, official, final = false, league = false, qualifiedCount, stageComplete = false }: { qualifiedCount?: number; stageComplete?: boolean; rounds: SchedulePhase["rodadas"]; participants: Participant[]; official?: OfficialClassification; final?: boolean; league?: boolean }) {
  const rows = classificationRows(rounds, participants, official);
  const bracketSize = qualifiedCount ? 2 ** Math.ceil(Math.log2(qualifiedCount)) : 0;
  const directCount = qualifiedCount ? (bracketSize === qualifiedCount ? qualifiedCount : bracketSize - qualifiedCount) : 0;
  return <article className={styles.card}>
    <header className={styles.header}><h3>Tabela de classificação</h3><span className={styles.badge}>{stageComplete ? "Liga finalizada" : final ? "Final" : official ? "Oficial" : "Provisória"}</span></header>
    <p className={styles.description}>Resultados acumulados até esta rodada. Vitória: 3 pontos · Empate: 1 ponto. {stageComplete ? "Fase de liga finalizada." : final ? "Campeonato finalizado." : official ? "Rodada finalizada." : "A rodada permanece em andamento."}</p>
    {qualifiedCount != null && <div className={styles.qualificationLegend}><span className={styles.directKey}>Verde · {directCount} vaga(s) sem preliminar</span>{qualifiedCount > directCount && <span className={styles.preliminaryKey}>Azul · {qualifiedCount-directCount} vaga(s) na preliminar</span>}<span>{stageComplete ? "Classificados pela ordem oficial da liga." : "Faixas provisórias; classificação confirmada ao encerrar a liga."}</span></div>}
    <div className={styles.scroll} tabIndex={0} role="region" aria-label="Tabela de classificação com rolagem horizontal"><table className={styles.table}>
      <caption className="sr-only">Classificação por pontos, vitórias, saldo de gols e gols marcados.</caption>
      <thead><tr><th scope="col" title="Movimentação em relação à rodada anterior">Mov.</th><th scope="col">Pos.</th><th scope="col">Jogador / Equipe</th><th scope="col" title="Pontos">PTS</th><th scope="col" title="Jogos">J</th><th scope="col" title="Vitórias">V</th><th scope="col" title="Empates">E</th><th scope="col" title="Derrotas">D</th><th scope="col" title="Gols marcados">GP</th><th scope="col" title="Gols sofridos">GC</th><th scope="col" title="Saldo de gols">SG</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.participant.id} data-qualification={qualifiedCount != null && index < qualifiedCount ? index < directCount ? "direct" : "preliminary" : undefined} className={final && league && official && row.position === 1 ? styles.champion : undefined}><td className={styles.movement} data-movement={row.movement} title={row.movement === "up" ? `Subiu ${row.variation} posição(ões)` : row.movement === "down" ? `Desceu ${Math.abs(row.variation)} posição(ões)` : "Manteve a posição"} aria-label={row.movement === "up" ? `Subiu ${row.variation} posição(ões)` : row.movement === "down" ? `Desceu ${Math.abs(row.variation)} posição(ões)` : "Manteve a posição"}><span aria-hidden="true">{row.movement === "up" ? `↑ ${Math.abs(row.variation)}` : row.movement === "down" ? `↓ ${Math.abs(row.variation)}` : "−"}</span></td><td className={styles.position}>{row.position}º</td><th scope="row"><span className={styles.identity}><StandingLogo team={row.participant.equipe} /><span>{row.participant.jogador.apelido?.trim() || row.participant.jogador.nome}{final && league && official && row.position === 1 && <small className={styles.championLabel}>★ Campeão</small>}</span></span></th><td className={styles.points}>{row.points}</td><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.goalsFor}</td><td>{row.goalsAgainst}</td><td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td></tr>)}</tbody>
    </table></div>
    <p className={styles.note}>↑ Subiu · ↓ Desceu · − Manteve, em relação à rodada anterior. Na primeira rodada, todos mantêm a posição. Desempates: pontos, vitórias, saldo de gols e gols marcados. {official ? "Ordem oficial e desempates confirmados pela API." : "Empates nesses critérios mantêm a mesma posição provisória; o sorteio oficial ocorre ao finalizar a rodada."}</p>
  </article>;
}





