import type { Participant } from "../novo/championship-form";
import type { SchedulePhase } from "./championship-schedule";
import { topScorers } from "./provisional-standings";
import MatrixPlayer from "./matrix-player";
import styles from "./championship-scorers.module.css";

export default function ChampionshipScorers({ rounds, participants, final = false }: { rounds: SchedulePhase["rodadas"]; participants: Participant[]; final?: boolean }) {
  const rows = topScorers(rounds, participants);
  return <article className={styles.card}>
    <header className={styles.header}><p>QUEM MAIS BALANÇOU A REDE</p><h3>Artilheiros do campeonato</h3><span>Gols acumulados até esta rodada</span></header>
    <ol className={styles.list} aria-label="Classificação de artilheiros">
      {rows.map((row) => <li key={row.participant.id} className={`${styles.row}${final && row.position === 1 ? ` ${styles.champion}` : ""}`}><span className={styles.position} aria-label={`${row.position}º lugar`}>{row.position}º</span><MatrixPlayer participant={row.participant} /><span className={styles.goals}><strong>{row.goalsFor}</strong><span>{row.goalsFor === 1 ? "gol" : "gols"}</span></span></li>)}
    </ol>
    {!rows.length && <p className={styles.empty}>Nenhum jogador cadastrado neste campeonato.</p>}
    <p className={styles.note}>Gols dos jogadores participantes, somados a partir dos placares das partidas finalizadas. Empates em gols compartilham a posição.</p>
  </article>;
}

