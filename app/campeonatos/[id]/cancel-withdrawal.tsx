"use client";

import { useEffect, useRef, useState } from "react";
import type { Championship } from "../novo/championship-form";
import styles from "./manual-groups.module.css";

export default function CancelWithdrawal({ championship, onUpdated }: { championship: Championship; onUpdated: (data: Championship) => void }) {
  const [selected, setSelected] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const players = championship.participantes.filter(player => championship.participantesDesistentes?.includes(player.id));
  const player = players.find(player => String(player.id) === selected);
  useEffect(() => { if (confirm) dialog.current?.showModal(); }, [confirm]);
  return <details className={styles.panel}><summary>Reverter desistência</summary><p className="form-note">Retira a marca de desistente deste campeonato e permite reabrir os W.O.s quando não houver dependências de jogos ou etapas posteriores.</p>
    <label htmlFor="return-player">Participante desistente</label><select id="return-player" disabled={pending} value={player ? selected : ""} onChange={event => setSelected(event.target.value)}><option value="">Selecione um participante</option>{players.map(player => <option key={player.id} value={player.id}>{player.jogador.apelido || player.jogador.nome} — {player.equipe.nome}</option>)}</select><button type="button" className="retry-button" disabled={pending || !player} onClick={() => { setError(""); setConfirm(true); }}>Reverter desistência</button>
    {confirm && <dialog ref={dialog} className="create-dialog" aria-labelledby="return-title" onClose={() => setConfirm(false)} onCancel={event => { if (lock.current) event.preventDefault(); }}><h2 id="return-title">Reverter desistência?</h2><p><strong>{player?.jogador.apelido || player?.jogador.nome || "Este participante"}</strong> voltará a ser elegível neste campeonato. W.O.s podem ser removidos ou recalculados e rodadas podem ser reabertas, inclusive em campeonato finalizado. Resultados realmente disputados serão preservados.</p><p>A API poderá bloquear a reversão se houver jogos posteriores, avanço do mata-mata ou substituição de classificados.</p>{error && <p role="alert" className="form-error">{error}</p>}<div className="organization-dialog-actions"><button type="button" className="retry-button" disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button><button type="button" className="form-submit" disabled={pending || !player} onClick={async () => {
      if (!player || lock.current) return;
      lock.current = true; setPending(true); setError("");
      try {
        const response = await fetch(`/api/campeonatos/${championship.id}/participantes/${player.id}/desistencia`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) throw new Error([data.detail, ...Object.values(data.erros || {})].filter(Boolean).join(" ") || "Não foi possível reverter a desistência.");
        if (data.id !== championship.id || !Array.isArray(data.participantesDesistentes)) throw new Error("Não foi possível confirmar a reversão. Atualize o campeonato.");
        onUpdated(data); setConfirm(false); setSelected("");
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a reversão. Atualize o campeonato."); }
      finally { lock.current = false; setPending(false); }
    }}>{pending ? "Revertendo…" : "Confirmar reversão"}</button></div></dialog>}
  </details>;
}
