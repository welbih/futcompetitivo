"use client";

import { useEffect, useRef, useState } from "react";
import type { Championship } from "../novo/championship-form";
import type { SchedulePhase } from "./championship-schedule";

type Match = SchedulePhase["rodadas"][number]["partidas"][number];

export default function MatchResultDialog({ championshipId, match, knockout = false, saveWithoutFinalizingRound, onClose, onSaved }: { championshipId: number; knockout?: boolean; saveWithoutFinalizingRound?: { roundId: number }; match: Match; onClose: () => void; onSaved: (championship: Championship) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [homeScore, setHomeScore] = useState(match.resultado ? String(match.resultado.golsMandante) : "");
  const [awayScore, setAwayScore] = useState(match.resultado ? String(match.resultado.golsVisitante) : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [homePenalties, setHomePenalties] = useState(match.resultado?.penaltisMandante != null ? String(match.resultado.penaltisMandante) : "");
  const [awayPenalties, setAwayPenalties] = useState(match.resultado?.penaltisVisitante != null ? String(match.resultado.penaltisVisitante) : "");
  const validNumber = (value: string) => value !== "" && /^\d+$/.test(value) && Number(value) <= 2147483647;
  const tied = knockout && homeScore !== "" && awayScore !== "" && Number(homeScore) === Number(awayScore);
  const valid = [homeScore, awayScore].every(validNumber) && (!tied || ([homePenalties, awayPenalties].every(validNumber) && Number(homePenalties) !== Number(awayPenalties)));

  useEffect(() => { dialog.current?.showModal(); }, []);

  return <dialog ref={dialog} className="create-dialog match-result-dialog" aria-labelledby="result-title" onClose={onClose} onCancel={(event) => { if (submitting.current) event.preventDefault(); }}>
    <button type="button" className="close-dialog" aria-label="Fechar placar" disabled={pending} onClick={() => dialog.current?.close()}>×</button>
    <p className="eyebrow">PARTIDA #{match.id} / RESULTADO</p><h2 id="result-title">{match.resultado ? "Editar placar" : "Adicionar placar"}</h2><p>Informe o resultado final da partida. {knockout ? "Em caso de empate, informe os pênaltis com um vencedor." : "Zero a zero também é um placar válido."}</p>
    <form onSubmit={async (event) => {
      event.preventDefault();
      if (!valid || submitting.current) return;
      submitting.current = true; setPending(true); setError("");
      try {
        const score = { golsMandante: Number(homeScore), golsVisitante: Number(awayScore), ...(tied ? { penaltisMandante: Number(homePenalties), penaltisVisitante: Number(awayPenalties) } : {}) };
        const url = saveWithoutFinalizingRound ? `/api/campeonatos/${championshipId}/rodadas/${saveWithoutFinalizingRound.roundId}/resultados` : `/api/campeonatos/${championshipId}/partidas/${match.id}/resultado`;
        const body = saveWithoutFinalizingRound ? { resultados: [{ partidaId: match.id, resultado: score }] } : score;
        const response = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const result = await response.json();
        if (!response.ok) throw new Error([result.detail, ...Object.values(result.erros || {})].filter(Boolean).join(" ") || "Não foi possível salvar o placar.");
        onSaved(result);
        onClose();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar o resultado. Atualize a agenda antes de tentar novamente."); }
      finally { submitting.current = false; setPending(false); }
    }}>
      <fieldset className="score-fields" disabled={pending}>
        <div><label htmlFor="home-score"><strong>{match.mandante.jogador.apelido || match.mandante.jogador.nome}</strong><span>{match.mandante.equipe.nome}</span></label><input id="home-score" name="golsMandante" type="number" min="0" max="2147483647" step="1" inputMode="numeric" required autoFocus value={homeScore} onChange={(event) => { if (/^\d*$/.test(event.target.value)) setHomeScore(event.target.value); }} onKeyDown={(event) => { if (["-", "+", "e", "E", ".", ","].includes(event.key)) event.preventDefault(); }} /></div>
        <span aria-hidden="true">×</span>
        <div><label htmlFor="away-score"><strong>{match.visitante.jogador.apelido || match.visitante.jogador.nome}</strong><span>{match.visitante.equipe.nome}</span></label><input id="away-score" name="golsVisitante" type="number" min="0" max="2147483647" step="1" inputMode="numeric" required value={awayScore} onChange={(event) => { if (/^\d*$/.test(event.target.value)) setAwayScore(event.target.value); }} onKeyDown={(event) => { if (["-", "+", "e", "E", ".", ","].includes(event.key)) event.preventDefault(); }} /></div>
      </fieldset>
      {tied && <fieldset className="score-fields" disabled={pending}><legend>Disputa de pênaltis</legend>{[{ name: match.mandante.jogador.apelido || match.mandante.jogador.nome, value: homePenalties, change: setHomePenalties }, { name: match.visitante.jogador.apelido || match.visitante.jogador.nome, value: awayPenalties, change: setAwayPenalties }].map((side, index) => <div key={index}><label htmlFor={`penalties-${index}`}>Pênaltis — {side.name}</label><input id={`penalties-${index}`} type="number" min="0" max="2147483647" step="1" required value={side.value} onChange={(event) => { if (/^\d*$/.test(event.target.value)) side.change(event.target.value); }} /></div>)}</fieldset>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="organization-dialog-actions"><button type="button" className="retry-button" disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit" className="form-submit" disabled={!valid || pending}>{pending ? "Salvando…" : "Salvar placar ↗"}</button></div>
      {pending && <p role="status">Salvando resultado…</p>}
    </form>
  </dialog>;
}

