import MatrixPlayer from "./matrix-player";
import type { Participant } from "../novo/championship-form";
import type { SchedulePhase } from "./championship-schedule";
import { encounterRecords } from "./encounter-record";

const symbols = { win: "○", loss: "×", draw: "△" };
const labels = { win: "Vitória", loss: "Derrota", draw: "Empate" };
const name = (participant: Participant) => participant.jogador.apelido?.trim() || participant.jogador.nome;

export default function EncounterMatrix({ rounds, participants }: { rounds: SchedulePhase["rodadas"]; participants: Participant[] }) {
  const encounters = encounterRecords(rounds);
  return <article className="round-card encounter-matrix-card">
    <header className="round-heading"><h3>Registro de vitórias e derrotas</h3></header>
    <p className="matrix-description">Leia pela perspectiva do jogador da linha. Resultados acumulados até esta rodada.</p>
    <div className="matrix-legend"><span><b className="matrix-win">○</b> Vitória</span><span><b className="matrix-loss">×</b> Derrota</span><span><b className="matrix-draw">△</b> Empate</span><span>Em branco: sem confronto</span></div>
    <div className="matrix-scroll" tabIndex={0} role="region" aria-label="Matriz de enfrentamentos com rolagem horizontal">
      <table className="encounter-matrix"><caption className="sr-only">Matriz de enfrentamentos. Círculo: vitória. X: derrota. Triângulo: empate. Célula vazia: ainda não se enfrentaram.</caption>
        <thead><tr><th scope="col">Jogador / Adversário</th>{participants.map((participant) => <th key={participant.jogador.id} scope="col">{name(participant)}</th>)}</tr></thead>
        <tbody>{participants.map((participant) => {
          return <tr key={participant.jogador.id}><th scope="row"><MatrixPlayer participant={participant} /></th>{participants.map((opponent) => {
            if (participant.jogador.id === opponent.jogador.id) return <td key={opponent.jogador.id} className="matrix-self" aria-label="Mesmo jogador">—</td>;
            const results = encounters.get(`${participant.jogador.id}-${opponent.jogador.id}`) || [];
            return <td key={opponent.jogador.id} aria-label={!results.length ? `${name(participant)} contra ${name(opponent)}: ainda não se enfrentaram` : undefined}><span className="matrix-symbols">{results.map((entry, index) => <span key={index} className={`matrix-symbol matrix-${entry.outcome}`} title={`${labels[entry.outcome]}: ${entry.goals} a ${entry.opponentGoals}`} aria-label={`${labels[entry.outcome]} de ${name(participant)} contra ${name(opponent)}: ${entry.goals} a ${entry.opponentGoals}`}>{symbols[entry.outcome]}</span>)}</span></td>;
          })}</tr>;
        })}</tbody>
      </table>
    </div>
    
  </article>;
}



