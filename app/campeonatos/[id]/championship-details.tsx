"use client";

import Link from "next/link";
import ChampionshipSchedule from "./championship-schedule";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ChampionshipForm, { type Championship } from "../novo/championship-form";

const statusNames: Record<string, string> = { CRIADO: "Criado", EM_ANDAMENTO: "Em andamento", FINALIZADO: "Finalizado" };

export default function ChampionshipDetails() {
  const { id } = useParams<{ id: string }>();
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [format, setFormat] = useState("LIGA");
  const [roundTrip, setRoundTrip] = useState(false);
  const [amount, setAmount] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/campeonatos/${id}`, { signal: controller.signal }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Não foi possível carregar o campeonato.");
      return result as Championship;
    }).then(setChampionship).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Falha ao carregar campeonato."); });
    return () => controller.abort();
  }, [id]);

  if (!championship) return <main className="resource-page"><Link href="/campeonatos" className="back-link">← Campeonatos</Link>{error ? <div role="alert" className="form-error"><p>{error}</p><button type="button" className="retry-button" onClick={() => window.location.reload()}>Tentar novamente</button></div> : <p role="status">Carregando campeonato…</p>}</main>;

  const canManage = championship.status === "CRIADO";
  const count = championship.participantes.length;
  const number = Number(amount);
  const configValid = format === "LIGA" || (amount !== "" && Number.isInteger(number) && number > 0 && number <= 2147483647 && (format !== "LIGA_PARCIAL" || (number >= 3 && number < count && count * number % 2 === 0)));

  if (editing && canManage) return <main className="creation-page"><button type="button" className="back-button" onClick={() => setEditing(false)}>← Voltar ao campeonato</button><div className="creation-heading"><p className="eyebrow">CAMPEONATO #{championship.id} / EDITAR</p><h1>AJUSTE SUA <em>DISPUTA.</em></h1></div><ChampionshipForm initial={championship} onCancel={() => setEditing(false)} onSaved={(updated) => { setChampionship(updated); setEditing(false); setNotice("Campeonato atualizado com sucesso."); setError(""); }} /></main>;

  if (championship.status === "EM_ANDAMENTO" || championship.status === "FINALIZADO") return <main className="resource-page championship-details">
    <Link href="/campeonatos" className="back-link">← Voltar aos campeonatos</Link>
    <div className="detail-heading"><div><p className="eyebrow">CAMPEONATO #{championship.id} / AGENDA</p><h1>{championship.organizacao.nome}</h1><p>Edição {championship.edicao} · {count} participantes <span className="resource-status championship-status" data-status={championship.status}>{statusNames[championship.status]}</span></p></div></div>
    {notice && <p role="status" className="organization-notice">{notice}</p>}
    <ChampionshipSchedule key={`${championship.id}-${championship.status}`} phases={championship.fases || []} participants={championship.participantes} championshipId={championship.id} classifications={championship.classificacaoPorRodada} editable={championship.status === "EM_ANDAMENTO"} onUpdated={(updated) => { setChampionship(updated); setNotice("Agenda atualizada com sucesso."); }} />
    <details className="schedule-participants"><summary>Ver participantes ({count})</summary><div className="selected-participants">{championship.participantes.map((participant) => <article key={participant.id} className="selected-participant"><strong>{participant.jogador.apelido || participant.jogador.nome}</strong><small>{participant.equipe.nome}</small></article>)}</div></details>
  </main>;

  return <main className="resource-page championship-details">
    <Link href="/campeonatos" className="back-link">← Voltar aos campeonatos</Link>
    <div className="detail-heading"><div><p className="eyebrow">CAMPEONATO #{championship.id}</p><h1>{championship.organizacao.nome}</h1><p>Edição {championship.edicao} <span className="resource-status championship-status" data-status={championship.status}>{statusNames[championship.status] || championship.status}</span></p></div><button type="button" className="retry-button" disabled={!canManage || pending} onClick={() => setEditing(true)}>Editar campeonato ↗</button></div>
    {notice && <p role="status" className="organization-notice">{notice}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <section className="detail-section" aria-labelledby="participants-title"><h2 id="participants-title">Participantes <span>({count})</span></h2><div className="selected-participants">{championship.participantes.map((participant) => <article key={participant.id} className="selected-participant"><strong>{participant.jogador.apelido || participant.jogador.nome}</strong><small>{participant.jogador.nome}</small><small>{participant.equipe.nome}</small>{(!participant.ativo || !participant.jogador.ativo || !participant.equipe.ativo) && <small>Cadastro inativo</small>}</article>)}</div></section>
    <section className="creation-panel start-panel" aria-labelledby="start-title"><h2 id="start-title">{canManage ? "Pronto para começar?" : "Competição iniciada"}</h2>
      {canManage ? <form onSubmit={async (event) => {
        event.preventDefault();
        if (!configValid || count < 4 || submitting.current) return;
        submitting.current = true; setPending(true); setError(""); setNotice("");
        const payload = format === "LIGA" ? { formato: format, turnoEreturno: roundTrip } : format === "SWISS" ? { formato: format, totalRodadas: number } : { formato: format, jogosPorParticipante: number };
        try {
          const response = await fetch(`/api/campeonatos/${id}/iniciar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const result = await response.json();
          if (!response.ok) throw new Error([result.detail, ...Object.values(result.erros || {})].filter(Boolean).join(" ") || "Não foi possível iniciar o campeonato.");
          setChampionship(result); setNotice("Campeonato iniciado! A ordem dos participantes foi sorteada e as rodadas foram geradas.");
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar o início. Atualize o campeonato antes de tentar novamente."); }
        finally { submitting.current = false; setPending(false); }
      }}><p>Escolha o formato. Ao iniciar, a API sorteia os participantes e gera as rodadas. O cadastro não poderá mais ser editado.</p><fieldset disabled={pending} className="creation-fields"><div className="form-grid"><div><label htmlFor="start-format">Formato</label><select id="start-format" value={format} onChange={(event) => { setFormat(event.target.value); setAmount(""); }}><option value="LIGA">Liga — todos contra todos</option><option value="LIGA_PARCIAL">Liga parcial</option><option value="SWISS">Suíço</option></select></div><div>{format === "LIGA" ? <><label htmlFor="round-trip">Confrontos</label><select id="round-trip" value={String(roundTrip)} onChange={(event) => setRoundTrip(event.target.value === "true")}><option value="false">Turno único</option><option value="true">Ida e volta</option></select></> : <><label htmlFor="start-amount">{format === "SWISS" ? "Total de rodadas" : "Jogos por participante"}</label><input id="start-amount" type="number" min={format === "LIGA_PARCIAL" ? 3 : 1} max={format === "SWISS" ? 2147483647 : count - 1} step="1" value={amount} onChange={(event) => { const value = event.target.value; if (format !== "LIGA_PARCIAL" || value === "" || /^\d+$/.test(value)) setAmount(value); }} onKeyDown={(event) => { if (format === "LIGA_PARCIAL" && ["-", "+", "e", "E", ".", ","].includes(event.key)) event.preventDefault(); }} required /></>}</div></div>{format === "LIGA_PARCIAL" && <p className="form-note">O mínimo é 3 jogos por participante, sempre menos que o total de participantes. {count % 2 === 0 ? "Com quantidade par de participantes, a quantidade de jogos pode ser par ou ímpar." : "Com quantidade ímpar de participantes, a quantidade de jogos deve ser par."}</p>}</fieldset>{count < 4 && <p className="form-error">Adicione pelo menos 4 participantes antes de iniciar.</p>}<button type="submit" className="form-submit" disabled={pending || !configValid || count < 4}>{pending ? "Iniciando…" : "Iniciar campeonato ▶"}</button></form> : <><p>O campeonato {championship.status === "FINALIZADO" ? "foi finalizado" : "está em andamento"}. A edição e o início estão indisponíveis neste status.</p><button type="button" className="form-submit" disabled>Iniciar campeonato</button></>}
    </section>
  </main>;
}








