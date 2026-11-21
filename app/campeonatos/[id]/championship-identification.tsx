"use client";

import { useEffect, useRef, useState } from "react";
import type { Championship } from "../novo/championship-form";

type Organization = Championship["organizacao"];

function IdentificationDialog({ championship, onClose, onSaved }: { championship: Championship; onClose: () => void; onSaved: (data: Championship) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [organizationId, setOrganizationId] = useState(String(championship.organizacao.id));
  const [edition, setEdition] = useState(String(championship.edicao));
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/organizacoes", { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(data.detail || "Não foi possível carregar as organizações.");
      if (!controller.signal.aborted) { setOrganizations(data); setLoadError(""); }
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : "Não foi possível carregar as organizações."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  const available = [championship.organizacao, ...organizations.filter(org => org.id !== championship.organizacao.id && org.ativo)].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const valid = /^\d+$/.test(edition) && Number(edition) >= 1 && Number(edition) <= 2147483647 && available.some(org => String(org.id) === organizationId);
  return <dialog ref={dialog} className="create-dialog" aria-labelledby="identification-title" onClose={onClose} onCancel={event => { if (lock.current) event.preventDefault(); }}>
    <button type="button" className="close-dialog" aria-label="Fechar edição" disabled={pending} onClick={() => dialog.current?.close()}>×</button>
    <h2 id="identification-title">Editar organização e edição</h2><p>Corrija a identificação do campeonato. Participantes, resultados e chaveamento serão preservados.</p>
    <form onSubmit={async event => {
      event.preventDefault();
      if (!valid || lock.current) return;
      lock.current = true; setPending(true); setError("");
      try {
        const response = await fetch(`/api/campeonatos/${championship.id}/identificacao`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizacaoId: Number(organizationId), edicao: Number(edition) }) });
        const data = await response.json();
        if (!response.ok) throw new Error([data.detail, ...Object.values(data.erros || {})].filter(Boolean).join(" ") || "Não foi possível salvar a identificação.");
        if (data.id !== championship.id || !data.organizacao || !Number.isInteger(data.edicao)) throw new Error("Não foi possível confirmar a alteração. Atualize o campeonato antes de tentar novamente.");
        onSaved(data); onClose();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a alteração. Atualize o campeonato."); }
      finally { lock.current = false; setPending(false); }
    }}>
      <fieldset className="creation-fields" disabled={pending}>
        <label htmlFor="identification-organization">Organização</label><select id="identification-organization" value={organizationId} disabled={loading} onChange={event => setOrganizationId(event.target.value)} required>{available.map(org => <option value={org.id} key={org.id}>{org.nome}{!org.ativo ? " (atual · inativa)" : ""}</option>)}</select>
        {loading && <p role="status">Carregando organizações…</p>}
        {loadError && <div role="alert"><p>{loadError} Você ainda pode corrigir a edição mantendo a organização atual.</p><button type="button" className="retry-button" onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Recarregar organizações</button></div>}
        <label htmlFor="identification-edition">Edição</label><input id="identification-edition" type="number" inputMode="numeric" min="1" max="2147483647" step="1" required value={edition} onChange={event => { if (/^\d*$/.test(event.target.value)) setEdition(event.target.value); }} onKeyDown={event => { if (["-", "+", "e", "E", ".", ","].includes(event.key)) event.preventDefault(); }} />
      </fieldset>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="organization-dialog-actions"><button type="button" className="retry-button" disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit" className="form-submit" disabled={!valid || pending}>{pending ? "Salvando…" : "Salvar alterações"}</button></div>
    </form>
  </dialog>;
}

export default function ChampionshipIdentification({ championship, onSaved }: { championship: Championship; onSaved: (data: Championship) => void }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="retry-button" onClick={() => setOpen(true)}>Editar organização e edição</button>{open && <IdentificationDialog championship={championship} onClose={() => setOpen(false)} onSaved={onSaved} />}</>;
}
