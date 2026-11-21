"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminPermission } from "../../components/use-admin-permission";
import type { Championship, Participant } from "../novo/championship-form";
import ManualTies from "./manual-ties";
import CancelWithdrawal from "./cancel-withdrawal";
import { validManualTies, type ManualTie } from "../manual-ties";
import styles from "./manual-groups.module.css";

type Vacancy = { desistenteId: number; grupoId: number | null; candidatos: Participant[] };
const name = (player?: Participant) => player ? player.jogador.apelido || player.jogador.nome : "Participante";

async function read(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error([data.detail, ...Object.values(data.erros || {})].filter(Boolean).join(" ") || "Não foi possível concluir a operação.");
  return data;
}

export default function ChampionshipManagement({ championship, onUpdated }: { championship: Championship; onUpdated: (data: Championship) => void }) {
  const admin = useAdminPermission();
  const [vacancies, setVacancies] = useState<Vacancy[] | null>(null);
  const [qualified, setQualified] = useState<Participant[]>([]);
  const [knockoutMode, setKnockoutMode] = useState("automatic");
  const [manualTies, setManualTies] = useState<ManualTie[]>([]);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [loadingError, setLoadingError] = useState("");
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState("");
  const [confirm, setConfirm] = useState<Participant | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const generation = championship.fases?.find(phase => phase.quantidadeClassificados != null)?.formaGeracaoMataMata ?? "AUTOMATICA";
  const waiting = championship.aguardandoMataMata === true;
  useEffect(() => {
    if (!admin || !waiting) return;
    const controller = new AbortController();
    const quantity = championship.fases?.find(phase => phase.quantidadeClassificados != null)?.quantidadeClassificados;
    Promise.all([
      fetch(`/api/campeonatos/${championship.id}/mata-mata/vagas`, { cache: "no-store", signal: controller.signal }).then(read),
      fetch(`/api/campeonatos/${championship.id}/classificados?quantidade=${quantity || championship.participantes.length}`, { cache: "no-store", signal: controller.signal }).then(read),
    ]).then(([data, classified]) => {
      if (!Array.isArray(data) || !Array.isArray(classified)) throw new Error("A API retornou vagas inválidas.");
      if (!controller.signal.aborted) { setVacancies(data); setQualified(classified); setLoadingError(""); setChoices({}); setManualTies([]); }
    }).catch((cause: unknown) => { if (!controller.signal.aborted) { setVacancies(null); setLoadingError(cause instanceof Error ? cause.message : "Não foi possível carregar as vagas."); } });
    return () => controller.abort();
  }, [admin, waiting, championship, retry]);
  useEffect(() => { if (confirm) dialog.current?.showModal(); }, [confirm]);
  if ((championship.status !== "EM_ANDAMENTO" && !(admin && championship.status === "FINALIZADO" && championship.participantesDesistentes?.length)) || (!admin && !waiting && !championship.participantesDesistentes?.length)) return null;
  const withdrawn = championship.participantesDesistentes || [];
  const available = championship.participantes.filter(player => !withdrawn.includes(player.id));
  const valid = vacancies !== null && vacancies.every(vacancy => vacancy.candidatos.some(player => String(player.id) === choices[vacancy.desistenteId])) && new Set(Object.values(choices).filter(Boolean)).size === vacancies.length;
  const eligible = qualified.map(player => { const replacement = choices[player.id]; return replacement ? championship.participantes.find(item => item.id === Number(replacement)) || player : player; });
  const tiesValid = knockoutMode !== "manual" || (eligible.length >= 4 && !eligible.some(player => withdrawn.includes(player.id)) && validManualTies(manualTies, eligible.map(player => player.id)));
  async function submit(path: string, body?: unknown) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      const data = await read(await fetch(`/api/campeonatos/${championship.id}${path}`, { method: "POST", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) }));
      onUpdated(data); setSelected(""); setConfirm(null); setVacancies(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Atualize o campeonato para confirmar a operação."); }
    finally { lock.current = false; setPending(false); }
  }
  return <section className="creation-panel" aria-label="Gestão do campeonato">
    {waiting && <><h2>Aguardando mata a mata</h2><p className="form-note">A fase classificatória terminou. O admin deve revisar as vagas e solicitar o início do chaveamento.</p></>}
    {withdrawn.length > 0 && <p className="form-note">Desistentes: {championship.participantes.filter(player => withdrawn.includes(player.id)).map(name).join(", ")}. Os jogos pendentes são resolvidos por W.O.</p>}
    {admin && <>
      {waiting && <div className={styles.panel}><h3>Vagas do mata a mata</h3><p className="form-note">Geração configurada: {generation === "ALEATORIA" ? "sorteio aleatório dos classificados, realizado uma única vez" : "montagem automática por posições"}. A definição manual tem prioridade.</p>{loadingError ? <div role="alert"><p>{loadingError}</p><button type="button" className="retry-button" onClick={() => setRetry(value => value + 1)}>Recarregar vagas</button></div> : vacancies === null ? <p role="status">Carregando vagas…</p> : <>
        {!vacancies.length && <p className="form-note">Nenhuma vaga aberta por desistência.</p>}
        {vacancies.map(vacancy => <div key={vacancy.desistenteId} className={styles.player}><label htmlFor={`vacancy-${vacancy.desistenteId}`}>Substituto de <strong>{name(championship.participantes.find(player => player.id === vacancy.desistenteId))}</strong></label><select id={`vacancy-${vacancy.desistenteId}`} disabled={pending} value={choices[vacancy.desistenteId] || ""} onChange={event => { setChoices({ ...choices, [vacancy.desistenteId]: event.target.value }); setManualTies([]); }}><option value="">Selecione</option>{vacancy.candidatos.map(player => <option key={player.id} value={player.id} disabled={Object.entries(choices).some(([key, value]) => Number(key) !== vacancy.desistenteId && value === String(player.id))}>{name(player)} — {player.equipe.nome}</option>)}</select>{!vacancy.candidatos.length && <p className="form-error">Nenhum candidato elegível. Revise esta vaga antes de iniciar.</p>}</div>)}
        <label htmlFor="qualifier-knockout-mode">Montagem da chave</label><select id="qualifier-knockout-mode" disabled={pending} value={knockoutMode} onChange={event => setKnockoutMode(event.target.value)}><option value="automatic">{generation === "ALEATORIA" ? "Usar sorteio aleatório configurado" : "Usar montagem por posições configurada"}</option><option value="manual">Definir confrontos manualmente</option></select>{knockoutMode === "manual" && (valid ? <ManualTies participants={eligible} value={manualTies} onChange={setManualTies} disabled={pending} /> : <p className="form-note">Preencha as vagas abertas antes de definir os confrontos.</p>)}
        <button type="button" className="form-submit" disabled={pending || !valid || !tiesValid} onClick={() => submit("/mata-mata", { ...(knockoutMode === "manual" ? { confrontosPrimeiraRodada: manualTies } : {}), substituicoes: vacancies.map(vacancy => ({ desistenteId: vacancy.desistenteId, substitutoId: Number(choices[vacancy.desistenteId]) })) })}>{pending ? "Processando…" : "Iniciar mata a mata"}</button>
      </>}</div>}
      {withdrawn.length > 0 && <CancelWithdrawal championship={championship} onUpdated={onUpdated} />}
      {championship.status === "EM_ANDAMENTO" && <details className={styles.panel}><summary>Registrar desistência</summary><p className="form-note">Apenas neste campeonato. Partidas disputadas são preservadas; as pendentes ficam em 3 × 0 para o adversário, ou 0 × 0 se ambos desistirem.</p><label htmlFor="withdraw-player">Participante</label><select id="withdraw-player" disabled={pending} value={selected} onChange={event => setSelected(event.target.value)}><option value="">Selecione um participante</option>{available.map(player => <option key={player.id} value={player.id}>{name(player)} — {player.equipe.nome}</option>)}</select><button type="button" className="retry-button" disabled={pending || !selected} onClick={() => setConfirm(available.find(player => String(player.id) === selected) || null)}>Registrar desistência</button></details>}
      {error && !confirm && <p role="alert" className="form-error">{error}</p>}
      {confirm && <dialog ref={dialog} className="create-dialog" aria-labelledby="withdraw-title" onClose={() => { setConfirm(null); setError(""); }} onCancel={event => { if (pending) event.preventDefault(); }}><h2 id="withdraw-title">Confirmar desistência?</h2><p><strong>{name(confirm)}</strong> será marcado como desistente neste campeonato. Seus jogos pendentes terão resultado por W.O. Os resultados já disputados serão preservados.</p>{error && <p role="alert" className="form-error">{error}</p>}<div className="organization-dialog-actions"><button type="button" className="retry-button" disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button><button type="button" className="form-submit" disabled={pending} onClick={() => submit(`/participantes/${confirm.id}/desistir`)}>{pending ? "Registrando…" : "Confirmar desistência"}</button></div></dialog>}
    </>}
  </section>;
}
