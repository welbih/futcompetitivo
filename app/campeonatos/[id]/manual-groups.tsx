import type { Participant } from "../novo/championship-form";
import styles from "./manual-groups.module.css";

export type GroupAssignments = Record<number, string>;

export default function ManualGroups({ participants, assignments, onChange, quantity }: { quantity: number; participants: Participant[]; assignments: GroupAssignments; onChange: (value: GroupAssignments) => void }) {
  const groups = Array.from({ length: quantity }, (_, index) => String(index));
  const label = (group: string) => `Grupo ${Number(group) < 26 ? String.fromCharCode(65 + Number(group)) : Number(group) + 1}`;
  const grouped = (group: string) => participants.filter(player => assignments[player.id] === group);
  return <section className={styles.panel} aria-labelledby="manual-groups-title">
    <h3 id="manual-groups-title">Organize os grupos</h3><p className="form-note">Escolha o grupo de cada participante. A distribuição será enviada ao iniciar o campeonato.</p>
    <p className={styles.counts} aria-live="polite">{groups.map(group => `${label(group)}: ${grouped(group).length}`).join(" · ")} · Sem grupo: {participants.filter(player => !groups.includes(assignments[player.id])).length}</p>
    <div className={styles.players}>{participants.map(player => <div key={player.id} className={styles.player}><label htmlFor={`group-player-${player.id}`}><strong>{player.jogador.apelido || player.jogador.nome}</strong><small>{player.equipe.nome}</small></label><select id={`group-player-${player.id}`} value={groups.includes(assignments[player.id]) ? assignments[player.id] : ""} required onChange={event => onChange({ ...assignments, [player.id]: event.target.value })}><option value="">Selecione</option>{groups.map(group => <option key={group} value={group}>{label(group)}</option>)}</select></div>)}</div>
    <div className={styles.preview}>{groups.map(group => <section key={group}><h4>{label(group)}</h4>{grouped(group).length ? <ul>{grouped(group).map(player => <li key={player.id}>{player.jogador.apelido || player.jogador.nome}</li>)}</ul> : <p>Nenhum participante</p>}</section>)}</div>
  </section>;
}
