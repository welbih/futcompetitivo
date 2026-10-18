"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./teams.module.css";

type Team = { id: number; nome: string; logoUrl: string; ativo: boolean };
type Action = { kind: "create" } | { kind: "edit" | "deactivate"; team: Team };

async function readResponse(response: Response) {
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error([result.detail, ...Object.values(result.erros || {})].filter(Boolean).join(" ") || "Não foi possível concluir a operação.");
  return result;
}

function TeamLogo({ team }: { team: { nome: string; logoUrl: string } }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = team.logoUrl?.trim() || "";
  const valid = /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url);
  return <div className={styles.logo}>{valid && failedUrl !== url ? <Image src={url} alt={`Logo de ${team.nome}`} width={64} height={64} unoptimized onError={() => setFailedUrl(url)} /> : <span aria-label={`Equipe ${team.nome}, logo indisponível`}>{team.nome.slice(0, 2).toUpperCase()}</span>}</div>;
}
function TeamDialog({ action, onClose, onSaved, onDeactivated }: { action: Action; onClose: () => void; onSaved: (team: Team) => void; onDeactivated: (id: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const team = action.kind === "create" ? null : action.team;
  const [name, setName] = useState(team?.nome || "");
  const [logoUrl, setLogoUrl] = useState(team?.logoUrl || "");
  const deactivate = action.kind === "deactivate";

  useEffect(() => { dialog.current?.showModal(); }, []);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="team-dialog-title" onClose={onClose} onCancel={(event) => { if (lock.current) event.preventDefault(); }}>
    <button type="button" className={styles.close} aria-label="Fechar" disabled={pending} onClick={() => dialog.current?.close()}>×</button>
    <p className="eyebrow">FUTEBOL COMPETITIVO / EQUIPE</p><h2 id="team-dialog-title">{deactivate ? "Inativar equipe?" : team ? "Editar equipe" : "Nova equipe"}</h2>
    <form onSubmit={async (event) => {
      event.preventDefault();
      if (lock.current || (!deactivate && (!name.trim() || !logoUrl.trim()))) return;
      lock.current = true; setPending(true); setError("");
      try {
        const response = await fetch(team ? `/api/equipes/${team.id}` : "/api/equipes", {
          method: deactivate ? "DELETE" : team ? "PUT" : "POST",
          ...(deactivate ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: name.trim(), logoUrl: logoUrl.trim() }) }),
        });
        const result = await readResponse(response);
        if (deactivate && team) onDeactivated(team.id);
        else {
          if (!result || !Number.isSafeInteger(result.id) || typeof result.nome !== "string" || typeof result.logoUrl !== "string") throw new Error("Não foi possível confirmar o cadastro. Atualize a listagem antes de tentar novamente.");
          onSaved(result);
        }
        onClose();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a operação. Atualize a listagem antes de tentar novamente."); }
      finally { lock.current = false; setPending(false); }
    }}>
      {deactivate ? <p className={styles.description}>Deseja inativar <strong>{team?.nome}</strong>? Ela permanecerá na listagem como inativa e não poderá ser incluída em novos campeonatos. O histórico será preservado.</p> : <fieldset disabled={pending} className={styles.fields}>
        <label htmlFor="team-name">Nome <span>*</span></label><input id="team-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da equipe" required maxLength={255} pattern=".*\S.*" autoFocus />
        <label htmlFor="team-logo">Endereço da logo <span>*</span></label><input id="team-logo" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://exemplo.com/logo.png" required maxLength={255} pattern=".*\S.*" />
        <div className={styles.preview}><span className={styles.previewLabel}>Prévia na listagem</span><article className={styles.card} aria-label="Prévia do card da equipe"><TeamLogo team={{ nome: name.trim() || "Equipe", logoUrl }} /><h2>{name.trim() || "Nome da equipe"}</h2><span className={styles.active}>Ativa</span></article><p className={styles.previewHint}>A imagem será exibida com o mesmo tamanho e proporção da listagem.</p></div>
      </fieldset>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.dialogActions}><button type="button" className={styles.secondary} disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit" className={deactivate ? styles.danger : styles.primary} disabled={pending || (!deactivate && (!name.trim() || !logoUrl.trim()))}>{pending ? "Salvando…" : deactivate ? "Inativar equipe" : "Salvar equipe"}</button></div>
      {pending && <p role="status" className={styles.description}>Processando…</p>}
    </form>
  </dialog>;
}

export default function TeamsManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [reload, setReload] = useState(0);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const activationLock = useRef(false);

  async function activateTeam(team: Team) {
    if (activationLock.current) return;
    activationLock.current = true; setActivatingId(team.id); setError(""); setNotice("");
    try {
      const result = await readResponse(await fetch(`/api/equipes/${team.id}/ativar`, { method: "PUT" }));
      if (!result || result.id !== team.id || result.ativo !== true) throw new Error("A API não confirmou a ativação. Atualize a listagem antes de tentar novamente.");
      setTeams((previous) => previous.map((item) => item.id === team.id ? result : item));
      setNotice("Equipe ativada com sucesso.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a ativação. Atualize a listagem."); }
    finally { activationLock.current = false; setActivatingId(null); }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/equipes", { signal: controller.signal }).then(readResponse).then((data) => {
      if (!Array.isArray(data)) throw new Error("A API retornou uma listagem inválida.");
      if (!controller.signal.aborted) setTeams(data);
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as equipes."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  return <main className="resource-page"><p className="eyebrow">FUTEBOL COMPETITIVO / SUA ARENA</p><div className="resource-heading"><div><h1>Equipe</h1><p>Cadastre e gerencie as equipes que entram em campo na sua arena.</p></div><button type="button" className={styles.primary} onClick={() => { setNotice(""); setAction({ kind: "create" }); }}>+ Nova equipe</button></div>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {loading && <p role="status" className="form-note">Carregando equipes…</p>}
    {error && <div role="alert" className={styles.error}><p>{error}</p><button type="button" className={styles.secondary} onClick={() => { setLoading(true); setError(""); setReload((value) => value + 1); }}>Atualizar listagem</button></div>}
    {!loading && !error && !teams.length && <p className="resource-empty">Nenhuma equipe cadastrada. Clique em Nova equipe para começar.</p>}
    <div className="resource-grid">{teams.map((team) => <article key={team.id} className={styles.card}><span className="eyebrow">#{team.id}</span><TeamLogo team={team} /><h2>{team.nome}</h2><span className={team.ativo ? styles.active : styles.inactive}>{team.ativo ? "Ativa" : "Inativa"}</span><div className={styles.cardActions}>{team.ativo ? <><button type="button" className={styles.secondary} disabled={activatingId !== null} aria-label={`Editar ${team.nome}`} onClick={() => { setNotice(""); setAction({ kind: "edit", team }); }}>Editar</button><button type="button" className={styles.deactivate} disabled={activatingId !== null} aria-label={`Inativar ${team.nome}`} onClick={() => { setNotice(""); setAction({ kind: "deactivate", team }); }}>Inativar</button></> : <button type="button" className={styles.primary} disabled={activatingId !== null} aria-label={`Ativar ${team.nome}`} onClick={() => activateTeam(team)}>{activatingId === team.id ? "Ativando…" : "Ativar"}</button>}</div></article>)}</div>
    {action && <TeamDialog key={action.kind === "create" ? "create" : `${action.kind}-${action.team.id}`} action={action} onClose={() => setAction(null)} onSaved={(team) => {
      setTeams((previous) => [...previous.filter((item) => item.id !== team.id), team].sort((a, b) => a.id - b.id));
      setNotice(action.kind === "create" ? "Equipe criada com sucesso." : "Equipe atualizada com sucesso.");
    }} onDeactivated={(id) => { setTeams((previous) => previous.map((team) => team.id === id ? { ...team, ativo: false } : team)); setNotice("Equipe inativada com sucesso."); }} />}
  </main>;
}





