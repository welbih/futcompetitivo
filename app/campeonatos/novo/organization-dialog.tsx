"use client";

import { useEffect, useRef, useState } from "react";

type Organization = { id: number; nome: string; ativo: boolean };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (organization: Organization) => void;
};

export default function OrganizationDialog({ open, onClose, onCreated }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);

  return <dialog ref={dialog} className="create-dialog" aria-labelledby="organization-dialog-title"
    onCancel={(event) => { if (submitting.current) event.preventDefault(); }}
    onClose={() => { setError(""); form.current?.reset(); onClose(); }}>
    <button type="button" className="close-dialog" aria-label="Fechar cadastro de organização" disabled={pending} onClick={() => dialog.current?.close()}>×</button>
    <p className="eyebrow">SUA COMUNIDADE / NOVA ORGANIZAÇÃO</p>
    <h2 id="organization-dialog-title">Crie sua organização.</h2>
    <p>Dê um nome à sua liga ou comunidade. Ela será cadastrada como ativa e selecionada neste campeonato.</p>
    <form ref={form} onSubmit={async (event) => {
      event.preventDefault();
      if (submitting.current) return;
      const nome = String(new FormData(event.currentTarget).get("nome") || "").trim();
      if (!nome) { setError("Informe o nome da organização."); return; }
      submitting.current = true;
      setPending(true);
      setError("");
      try {
        const response = await fetch("/api/organizacoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome }) });
        const result = await response.json();
        if (!response.ok) throw new Error([result.detail, ...Object.values(result.erros || {})].filter(Boolean).join(" ") || "Não foi possível cadastrar a organização.");
        if (!Number.isSafeInteger(result.id) || result.id <= 0 || typeof result.nome !== "string" || result.ativo !== true) throw new Error("A API não confirmou uma organização ativa válida. Consulte os cadastros antes de tentar novamente.");
        onCreated(result);
        dialog.current?.close();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar o cadastro. Verifique sua conexão."); }
      finally { submitting.current = false; setPending(false); }
    }}>
      <label htmlFor="organization-name">Nome da organização</label>
      <input id="organization-name" name="nome" placeholder="Ex.: Liga dos Amigos" required maxLength={255} pattern=".*\S.*" disabled={pending} autoFocus />
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="organization-dialog-actions"><button type="button" className="retry-button" disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit" className="form-submit" disabled={pending}>{pending ? "Salvando…" : "Salvar organização ↗"}</button></div>
      {pending && <p role="status">Cadastrando organização…</p>}
    </form>
  </dialog>;
}
