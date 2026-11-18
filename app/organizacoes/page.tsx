"use client";

import { useEffect, useRef, useState } from "react";
import OrganizationDialog, { type Organization } from "../campeonatos/novo/organization-dialog";
import { useAdminPermission, useAuthenticatedPermission } from "../components/use-admin-permission";
import styles from "../equipes/teams.module.css";
import OrganizationTrophy from "./organization-trophy";

function RemoveOrganization({ organization, onClose, onRemoved }: { organization: Organization; onClose: () => void; onRemoved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="create-dialog" aria-labelledby="remove-organization-title" onClose={onClose} onCancel={event => { if (lock.current) event.preventDefault(); }}>
    <button type="button" className="close-dialog" aria-label="Fechar confirmação" disabled={pending} onClick={() => dialog.current?.close()}>×</button>
    <h2 id="remove-organization-title">Remover organização?</h2>
    <p>Deseja remover <strong>{organization.nome}</strong>? A organização será desativada e seu histórico será preservado.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="organization-dialog-actions championship-delete-actions">
      <button type="button" className="retry-button" autoFocus disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button>
      <button type="button" className="form-submit" disabled={pending} onClick={async () => {
        if (lock.current) return;
        lock.current = true; setPending(true); setError("");
        try {
          const response = await fetch(`/api/organizacoes/${organization.id}`, { method: "DELETE" });
          if (!response.ok) throw new Error((await response.json()).detail || "Não foi possível remover a organização.");
          onRemoved(); onClose();
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a remoção."); }
        finally { lock.current = false; setPending(false); }
      }}>{pending ? "Removendo…" : "Remover"}</button>
    </div>
  </dialog>;
}

export default function OrganizationsPage() {
  const isAdmin = useAdminPermission();
  const authenticated = useAuthenticatedPermission();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [trophyRevision, setTrophyRevision] = useState(0);
  const [action, setAction] = useState<{ kind: "create" } | { kind: "edit" | "remove"; organization: Organization } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/organizacoes", { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(data.detail || "Listagem de organizações inválida.");
      if (!controller.signal.aborted) setOrganizations(data);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as organizações."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  const visible = organizations.filter(item => isAdmin || item.ativo).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  return <main className="resource-page"><p className="eyebrow">FUTEBOL COMPETITIVO / SUA ARENA</p>
    <div className="resource-heading"><div><h1>Organizações</h1><p>As ligas e comunidades que fazem parte da sua arena.</p></div>{authenticated && <button className={styles.primary} onClick={() => { setNotice(""); setAction({ kind: "create" }); }}>+ Nova organização</button>}</div>
    {loading && <p role="status" className="form-note">Carregando organizações…</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {error && <div role="alert" className={styles.error}><p>{error}</p><button className={styles.secondary} onClick={() => { setLoading(true); setError(""); setReload(value => value + 1); }}>Tentar novamente</button></div>}
    {!loading && !error && !visible.length && <p className="resource-empty">Nenhuma organização disponível.</p>}
    <div className="resource-grid">{visible.map(organization => <article key={organization.id} className="resource-card" style={{ textAlign: "center" }}><OrganizationTrophy organization={organization} revision={trophyRevision} /><h2>{organization.nome}</h2>{isAdmin && <>
      <span className={organization.ativo ? styles.active : styles.inactive}>{organization.ativo ? "Ativa" : "Inativa"}</span>
      <div className={styles.cardActions}><button className={styles.secondary} onClick={() => { setNotice(""); setAction({ kind: "edit", organization }); }}>Editar</button>{organization.ativo && <button className={styles.danger} onClick={() => setAction({ kind: "remove", organization })}>Remover</button>}</div>
    </>}</article>)}</div>
    {action && action.kind !== "remove" && (action.kind === "create" ? authenticated : isAdmin) && <OrganizationDialog key={action.kind === "edit" ? action.organization.id : "create"} open standalone initial={action.kind === "edit" ? action.organization : undefined} onClose={() => setAction(null)} onCreated={organization => {
      setOrganizations(current => [...current.filter(item => item.id !== organization.id), organization]);
      setTrophyRevision(value => value + 1);
      setNotice(action.kind === "edit" ? "Organização atualizada com sucesso." : "Organização criada com sucesso.");
    }} />}
    {action?.kind === "remove" && isAdmin && <RemoveOrganization organization={action.organization} onClose={() => setAction(null)} onRemoved={() => {
      setOrganizations(current => current.map(item => item.id === action.organization.id ? { ...item, ativo: false } : item));
      setNotice("Organização removida da listagem de ativas.");
    }} />}
  </main>;
}
