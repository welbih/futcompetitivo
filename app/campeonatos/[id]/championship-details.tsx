"use client";

import Link from "next/link";
import { useChampionshipLive } from "./use-championship-live";
import { useAdminPermission } from "../../components/use-admin-permission";
import ManualSchedule from "./manual-schedule";
import { validPartialSchedule, type ScheduledRound } from "../partial-schedule";
import ManualTies from "./manual-ties";
import { validManualTies, type ManualTie } from "../manual-ties";
import ManualGroups, { type GroupAssignments } from "./manual-groups";
import ChampionshipManagement from "./championship-management";
import GroupChampionship from "./group-championship";
import MixedChampionship from "./mixed-championship";
import KnockoutBracket from "./knockout-bracket";
import ChampionshipSchedule from "./championship-schedule";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import ChampionshipForm from "../novo/championship-form";

const statusNames: Record<string, string> = { CRIADO: "Criado", EM_ANDAMENTO: "Em andamento", FINALIZADO: "Finalizado" };

export default function ChampionshipDetails() {
  const { id } = useParams<{ id: string }>();
  const { championship, update: setChampionship, error: liveError, status: liveStatus, removed } = useChampionshipLive(id);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [format, setFormat] = useState("LIGA");
  const [roundTrip, setRoundTrip] = useState(false);
  const [knockoutFormat, setKnockoutFormat] = useState("JOGO_UNICO");
  const [thirdPlace, setThirdPlace] = useState(false);
  const [scheduleMode, setScheduleMode] = useState("automatic");
  const [manualRounds, setManualRounds] = useState<ScheduledRound[]>([]);
  const [generation, setGeneration] = useState("");
  const [knockoutMode, setKnockoutMode] = useState("automatic");
  const [manualTies, setManualTies] = useState<ManualTie[]>([]);
  const [qualifiers, setQualifiers] = useState("");
  const [amount, setAmount] = useState("");
  const submitting = useRef(false);
  const isAdmin = useAdminPermission();
  const [groupQuantity, setGroupQuantity] = useState("2");
  const [groupMode, setGroupMode] = useState("automatic");
  const [assignments, setAssignments] = useState<GroupAssignments>({});

  const connectionNotice = <p className="form-note" role="status">{liveStatus === "live" ? "● Atualizações ao vivo conectadas" : liveStatus === "sync-error" ? "Não foi possível sincronizar. Tentando novamente…" : liveStatus === "reconnecting" ? "Reconectando às atualizações ao vivo…" : "Conectando às atualizações ao vivo…"}{liveError && ` ${liveError}`}</p>;
  if (removed) return <main className="resource-page"><h1>Campeonato removido</h1><p>Este campeonato foi excluído. A conexão ao vivo foi encerrada.</p><Link href="/campeonatos" className="back-link">← Voltar aos campeonatos</Link></main>;
  if (!championship) return <main className="resource-page"><Link href="/campeonatos" className="back-link">← Campeonatos</Link>{(error || liveError) ? <div role="alert" className="form-error"><p>{error || liveError}</p><button type="button" className="retry-button" onClick={() => window.location.reload()}>Tentar novamente</button></div> : <p role="status">Carregando campeonato…</p>}</main>;

  const canManage = championship.status === "CRIADO";
  const count = championship.participantes.length;
  const number = Number(amount);
  const manualKnockout = format === "ELIMINATORIO" && knockoutMode === "manual";
  const generationMode = generation || (format === "ELIMINATORIO" && !manualKnockout ? "ALEATORIA" : "AUTOMATICA");
  const tiesValid = !manualKnockout || (isAdmin && validManualTies(manualTies, championship.participantes.map(player => player.id)));
  const manual = format === "GRUPOS" && groupMode === "manual";
  const groupCount = Number(groupQuantity);
  const groups = Array.from({ length: Number.isInteger(groupCount) && groupCount >= 2 && groupCount <= Math.floor(count / 3) ? groupCount : 0 }, (_, index) => championship.participantes.filter(player => assignments[player.id] === String(index)).map(player => player.id));
  const groupsValid = format !== "GRUPOS" || (groups.length >= 2 && (!manual || (isAdmin && groups.flat().length === count && groups.every(group => group.length >= Math.max(3, Math.floor(Number(qualifiers) / groupCount))))));
  const partial = format === "LIGA_PARCIAL" || format === "MISTA_PARCIAL";
  const mixed = ["MISTA", "MISTA_PARCIAL", "GRUPOS"].includes(format);
  const manualSchedule = partial && scheduleMode === "manual";
  const configValid = format !== "SWISS" && (!mixed || (/^\d+$/.test(qualifiers) && Number(qualifiers) >= 4 && Number(qualifiers) <= count)) && (!partial || (Number.isInteger(number) && number >= 3 && number < count && count * number % 2 === 0)) && (!manualSchedule || (isAdmin && validPartialSchedule(manualRounds, number, championship.participantes.map(player => player.id))));

  if (editing && canManage) return <main className="creation-page"><button type="button" className="back-button" onClick={() => setEditing(false)}>← Voltar ao campeonato</button><div className="creation-heading"><p className="eyebrow">CAMPEONATO #{championship.id} / EDITAR</p><h1>AJUSTE SUA <em>DISPUTA.</em></h1></div><ChampionshipForm initial={championship} onCancel={() => setEditing(false)} onSaved={(updated) => { setChampionship(updated); setEditing(false); setNotice("Campeonato atualizado com sucesso."); setError(""); }} /></main>;

  if (championship.status === "EM_ANDAMENTO" || championship.status === "FINALIZADO") return <main className="resource-page championship-details">
    <Link href="/campeonatos" className="back-link">← Voltar aos campeonatos</Link>{connectionNotice}<Link href={`/campeonatos/${id}/classificacao`} target="_blank" rel="noopener noreferrer" className="back-link">Abrir classificação ao vivo ↗</Link> <Link href={`/campeonatos/${id}/mata-mata`} target="_blank" rel="noopener noreferrer" className="back-link">Abrir mata-mata ao vivo ↗</Link>
    <div className="detail-heading"><div><p className="eyebrow">CAMPEONATO #{championship.id} / AGENDA</p><h1>{championship.organizacao.nome}</h1><p>Edição {championship.edicao} · {count} participantes <span className="resource-status championship-status" data-status={championship.status}>{statusNames[championship.status]}</span></p></div></div>
    {notice && <p role="status" className="organization-notice">{notice}</p>}
    <ChampionshipManagement championship={championship} onUpdated={updated => { setChampionship(updated); setNotice("Campeonato atualizado com sucesso."); }} />
    {championship.fases?.some((phase) => phase.tipo === "GRUPOS") ? <GroupChampionship key={championship.id} championship={championship} onUpdated={(updated) => { setChampionship(updated); setNotice("Campeonato atualizado com sucesso."); }} /> : championship.fases?.some((phase) => phase.quantidadeClassificados != null) ? <MixedChampionship key={championship.id} championship={championship} onUpdated={(updated) => { setChampionship(updated); setNotice("Campeonato atualizado com sucesso."); }} /> : championship.fases?.some((phase) => phase.tipo === "ELIMINATORIA") ? <KnockoutBracket key={championship.id} championship={championship} onUpdated={(updated) => { setChampionship(updated); setNotice("Chaveamento atualizado com sucesso."); }} /> : <ChampionshipSchedule currentClassification={championship.classificacaoAtual ?? undefined} key={`${championship.id}-${championship.status}`} phases={championship.fases || []} participants={championship.participantes} championshipId={championship.id} classifications={championship.classificacaoPorRodada} editable={championship.status === "EM_ANDAMENTO"} onUpdated={(updated) => { setChampionship(updated); setNotice("Agenda atualizada com sucesso."); }} />}
    <details className="schedule-participants"><summary>Ver participantes ({count})</summary><div className="selected-participants">{championship.participantes.map((participant) => <article key={participant.id} className="selected-participant"><strong>{participant.jogador.apelido || participant.jogador.nome}</strong><small>{participant.equipe.nome}</small></article>)}</div></details>
  </main>;

  return <main className="resource-page championship-details">
    <Link href="/campeonatos" className="back-link">← Voltar aos campeonatos</Link>{connectionNotice}<Link href={`/campeonatos/${id}/classificacao`} target="_blank" rel="noopener noreferrer" className="back-link">Abrir classificação ao vivo ↗</Link> <Link href={`/campeonatos/${id}/mata-mata`} target="_blank" rel="noopener noreferrer" className="back-link">Abrir mata-mata ao vivo ↗</Link>
    <div className="detail-heading"><div><p className="eyebrow">CAMPEONATO #{championship.id}</p><h1>{championship.organizacao.nome}</h1><p>Edição {championship.edicao} <span className="resource-status championship-status" data-status={championship.status}>{statusNames[championship.status] || championship.status}</span></p></div><button type="button" className="retry-button" disabled={!canManage || pending} onClick={() => setEditing(true)}>Editar campeonato ↗</button></div>
    {notice && <p role="status" className="organization-notice">{notice}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <section className="detail-section" aria-labelledby="participants-title"><h2 id="participants-title">Participantes <span>({count})</span></h2><div className="selected-participants">{championship.participantes.map((participant) => <article key={participant.id} className="selected-participant"><strong>{participant.jogador.apelido || participant.jogador.nome}</strong><small>{participant.jogador.nome}</small><small>{participant.equipe.nome}</small>{(!participant.ativo || !participant.jogador.ativo || !participant.equipe.ativo) && <small>Cadastro inativo</small>}</article>)}</div></section>
    <section className="creation-panel start-panel" aria-labelledby="start-title"><h2 id="start-title">{canManage ? "Pronto para começar?" : "Competição iniciada"}</h2>
      {canManage ? <form onSubmit={async (event) => {
        event.preventDefault();
        if (!configValid || !groupsValid || !tiesValid || count < 4 || submitting.current) return;
        submitting.current = true; setPending(true); setError(""); setNotice("");
        const payload = format === "MISTA_PARCIAL" ? { formato: format, jogosPorParticipante: number, quantidadeClassificados: Number(qualifiers) } : manualKnockout ? { confrontosPrimeiraRodada: manualTies } : manual ? { grupos: groups, quantidadeClassificados: Number(qualifiers), turnoEreturno: roundTrip } : (format === "MISTA" || format === "GRUPOS") ? { formato: format, turnoEreturno: roundTrip, quantidadeClassificados: Number(qualifiers), ...(format === "GRUPOS" ? { quantidadeGrupos: groupCount } : {}) } : format === "ELIMINATORIO" ? { formato: format, turnoEreturno: false } : format === "LIGA" ? { formato: format, turnoEreturno: roundTrip } : format === "SWISS" ? { formato: format, totalRodadas: number } : { formato: format, jogosPorParticipante: number };
        try {
          const response = await fetch(`/api/campeonatos/${id}/iniciar${manualSchedule ? "/liga-parcial/manual" : manualKnockout ? "/eliminatorio/manual" : manual ? "/grupos" : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(manualSchedule ? { configuracao: { ...payload, ...(format === "MISTA_PARCIAL" ? { formatoEliminatorio: knockoutFormat, disputaTerceiroLugar: thirdPlace, formaGeracaoMataMata: generationMode } : {}) }, rodadas: manualRounds } : { ...payload, ...(["GRUPOS", "MISTA", "MISTA_PARCIAL", "ELIMINATORIO"].includes(format) ? { formatoEliminatorio: knockoutFormat, disputaTerceiroLugar: thirdPlace, formaGeracaoMataMata: generationMode } : {}) }) });
          const result = await response.json();
          if (!response.ok) throw new Error([result.detail, ...Object.values(result.erros || {})].filter(Boolean).join(" ") || "Não foi possível iniciar o campeonato.");
          setChampionship(result); setNotice(manualKnockout ? "Campeonato iniciado com os confrontos definidos manualmente." : manual ? "Campeonato iniciado com os grupos definidos manualmente. As rodadas foram geradas." : "Campeonato iniciado! A configuração foi aplicada e as rodadas foram geradas.");
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar o início. Atualize o campeonato antes de tentar novamente."); }
        finally { submitting.current = false; setPending(false); }
      }}><p>Escolha o formato e configure a disputa. Ao iniciar, as rodadas serão geradas e o cadastro não poderá mais ser editado.</p><fieldset disabled={pending} className="creation-fields"><div className="form-grid"><div><label htmlFor="start-format">Formato</label><select id="start-format" value={format} onChange={(event) => { setFormat(event.target.value); setAmount(""); }}><option value="LIGA">Liga — todos contra todos</option><option value="LIGA_PARCIAL">Liga parcial</option><option value="MISTA_PARCIAL">Liga parcial + mata a mata</option><option value="SWISS" disabled>Suíço — indisponível</option><option value="ELIMINATORIO">Eliminatório — mata a mata</option><option value="MISTA">Liga mista — liga + mata a mata</option><option value="GRUPOS">Fase de grupos + mata a mata</option></select></div><div>{format === "ELIMINATORIO" ? <p className="form-note">Configure abaixo os jogos eliminatórios. O vencedor de cada confronto avança.</p> : (format === "LIGA" || format === "MISTA" || format === "GRUPOS") ? <><label htmlFor="round-trip">Confrontos</label><select id="round-trip" value={String(roundTrip)} onChange={(event) => setRoundTrip(event.target.value === "true")}><option value="false">Turno único</option><option value="true">Ida e volta</option></select></> : <><label htmlFor="start-amount">{format === "SWISS" ? "Total de rodadas" : "Jogos por participante"}</label><input id="start-amount" type="number" min={partial ? 3 : 1} max={format === "SWISS" ? 2147483647 : count - 1} step="1" value={amount} onChange={(event) => { const value = event.target.value; if (!partial || value === "" || /^\d+$/.test(value)) setAmount(value); }} onKeyDown={(event) => { if (partial && ["-", "+", "e", "E", ".", ","].includes(event.key)) event.preventDefault(); }} required /></>}</div></div>{mixed && <div className="form-grid"><div><label htmlFor="qualifiers">Classificados para o mata a mata</label><input id="qualifiers" type="number" min="4" max={count} step="1" required value={qualifiers} onChange={(event) => { if (/^\d*$/.test(event.target.value)) setQualifiers(event.target.value); }} /><p className="form-note">De 4 a {count} classificados. {format === "GRUPOS" ? "Vagas distribuídas entre os grupos. As vagas restantes são definidas pela API por desempenho proporcional entre os próximos colocados." : "Os melhores colocados podem avançar sem preliminar. Configure abaixo os jogos eliminatórios."}</p></div></div>}{["GRUPOS", "MISTA", "MISTA_PARCIAL", "ELIMINATORIO"].includes(format) && <div className="form-grid"><div><label htmlFor="knockout-format">Jogos do mata a mata</label><select id="knockout-format" value={knockoutFormat} onChange={event => setKnockoutFormat(event.target.value)}><option value="JOGO_UNICO">Jogo único</option><option value="IDA_E_VOLTA">Ida e volta, incluindo as decisões</option><option value="IDA_E_VOLTA_FINAL_UNICA">Ida e volta com final e terceiro lugar únicos</option></select></div><div><label htmlFor="third-place">Disputa de terceiro lugar</label><select id="third-place" value={String(thirdPlace)} onChange={event => setThirdPlace(event.target.value === "true")}><option value="false">Não</option><option value="true">Sim</option></select></div></div>}{["ELIMINATORIO", "MISTA", "MISTA_PARCIAL", "GRUPOS"].includes(format) && <><label htmlFor="knockout-generation">Forma de geração do mata a mata</label><select id="knockout-generation" value={generationMode} onChange={event => setGeneration(event.target.value)}><option value="AUTOMATICA">Por posições — montagem automática</option><option value="ALEATORIA">Sorteio aleatório</option></select><p className="form-note">{generationMode === "ALEATORIA" ? "Sorteia os participantes elegíveis uma única vez ao montar a chave. Não há novos sorteios entre as rodadas." : format === "ELIMINATORIO" ? "Usa a ordem dos participantes cadastrados, sem sorteio. As primeiras posições recebem as folgas." : "Usa a classificação para distribuir os confrontos e as folgas. Nos grupos, intercala A1, B1, A2, B2…"} Os confrontos definidos manualmente pelo admin prevalecem sobre esta configuração.</p></>}{format === "ELIMINATORIO" && isAdmin && <><label htmlFor="knockout-mode">Montagem da chave</label><select id="knockout-mode" value={knockoutMode} onChange={event => setKnockoutMode(event.target.value)}><option value="automatic">Usar forma de geração configurada</option><option value="manual">Definir confrontos manualmente</option></select></>}{manualKnockout && isAdmin && <ManualTies participants={championship.participantes} value={manualTies} onChange={setManualTies} />}{format === "GRUPOS" && <><label htmlFor="group-quantity">Quantidade de grupos</label><input id="group-quantity" type="number" inputMode="numeric" min="2" max={Math.max(2, Math.floor(count / 3))} step="1" required value={groupQuantity} onChange={event => { if (/^\d*$/.test(event.target.value)) { setGroupQuantity(event.target.value); setAssignments({}); } }} /><p className="form-note">Pelo menos 3 participantes por grupo. {count >= 6 ? `Com ${count} participantes, escolha de 2 a ${Math.floor(count / 3)} grupos.` : "Adicione pelo menos 6 participantes para iniciar uma fase de grupos."}</p></>}{format === "GRUPOS" && isAdmin && <><label htmlFor="group-mode">Distribuição dos grupos</label><select id="group-mode" value={groupMode} onChange={event => setGroupMode(event.target.value)}><option value="automatic">Sorteio automático</option><option value="manual">Definir grupos manualmente</option></select></>}{manual && isAdmin && <><ManualGroups quantity={groups.length} participants={championship.participantes} assignments={assignments} onChange={setAssignments} /><p className="form-note">Inclua todos os participantes, com pelo menos {Math.max(3, Math.floor(Number(qualifiers) / (groupCount || 2)) || 3)} em cada grupo para a quantidade de classificados escolhida.</p></>}{partial && <p className="form-note">O mínimo é 3 jogos por participante, sempre menos que o total de participantes. {count % 2 === 0 ? "Com quantidade par de participantes, a quantidade de jogos pode ser par ou ímpar." : "Com quantidade ímpar de participantes, a quantidade de jogos deve ser par."}</p>}{partial && isAdmin && <><label htmlFor="partial-schedule-mode">Agenda da liga parcial</label><select id="partial-schedule-mode" value={scheduleMode} onChange={event => setScheduleMode(event.target.value)}><option value="automatic">Gerar automaticamente</option><option value="manual">Definir jogos por rodada</option></select></>}{manualSchedule && isAdmin && <><ManualSchedule games={number} participants={championship.participantes} value={manualRounds} onChange={setManualRounds} /><p className="form-note">Cada participante deve ter exatamente {number || "a quantidade configurada de"} jogos, com adversários diferentes, para liberar o início.</p></>}</fieldset>{count < 4 && <p className="form-error">Adicione pelo menos 4 participantes antes de iniciar.</p>}<button type="submit" className="form-submit" disabled={pending || !configValid || !groupsValid || !tiesValid || count < 4}>{pending ? "Iniciando…" : "Iniciar campeonato ▶"}</button></form> : <><p>O campeonato {championship.status === "FINALIZADO" ? "foi finalizado" : "está em andamento"}. A edição e o início estão indisponíveis neste status.</p><button type="button" className="form-submit" disabled>Iniciar campeonato</button></>}
    </section>
  </main>;
}








