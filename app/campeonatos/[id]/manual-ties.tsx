import type { Participant } from "../novo/championship-form";
import { firstRoundSize, type ManualTie } from "../manual-ties";
import styles from "./manual-groups.module.css";

export default function ManualTies({ participants, value, onChange, disabled = false }: { participants: Participant[]; value: ManualTie[]; onChange: (ties: ManualTie[]) => void; disabled?: boolean }) {
  const count = firstRoundSize(participants.length);
  const rows = Array.from({ length: count }, (_, index) => value[index] || { mandanteId: null, visitanteId: null });
  const selected = rows.flatMap(tie => [tie.mandanteId, tie.visitanteId]).filter(id => id !== null);
  const missing = participants.filter(player => !selected.includes(player.id));
  return <section className={styles.panel} aria-labelledby="manual-ties-title"><h3 id="manual-ties-title">Primeira rodada</h3><p className="form-note">O mandante recebe o jogo único ou o jogo de ida. Os vencedores dos confrontos 1 e 2 se enfrentam na próxima etapa, depois os de 3 e 4, e assim por diante. Para uma folga, deixe apenas um lado sem participante.</p><p className={styles.counts} aria-live="polite">{selected.length} de {participants.length} participantes distribuídos · {count * 2 - participants.length} folgas</p>
    <div className={styles.tieList}>{rows.map((tie, index) => <fieldset key={index} className={styles.tie} disabled={disabled}><legend>Confronto {index + 1}</legend>{(["mandanteId", "visitanteId"] as const).map((side, sideIndex) => <div key={side}><label htmlFor={`tie-${index}-${side}`}>{sideIndex === 0 ? "Mandante / ida" : "Visitante"}</label><select id={`tie-${index}-${side}`} value={tie[side] ?? ""} onChange={event => onChange(rows.map((row, position) => position === index ? { ...row, [side]: event.target.value ? Number(event.target.value) : null } : row))}><option value="">Sem participante (folga)</option>{participants.map(player => <option key={player.id} value={player.id} disabled={selected.includes(player.id) && tie[side] !== player.id}>{player.jogador.apelido || player.jogador.nome} — {player.equipe.nome}</option>)}</select></div>)}</fieldset>)}</div>
    {missing.length > 0 && <p className="form-note">Faltam: {missing.map(player => player.jogador.apelido || player.jogador.nome).join(", ")}.</p>}
  </section>;
}
