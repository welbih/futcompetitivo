"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export type Organization = { id: number; nome: string; ativo: boolean; trofeuUrl?: string | null };

type Props = {
  open: boolean;
  initial?: Organization;
  standalone?: boolean;
  onClose: () => void;
  onCreated: (organization: Organization) => void;
};

export default function OrganizationDialog({ open, onClose, onCreated, initial, standalone = false }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [trophy, setTrophy] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [imageError, setImageError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    if (open && !dialog.current?.open) {
      dialog.current?.showModal();
      nameInput.current?.focus();
    }
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);

  return <dialog ref={dialog} className="create-dialog" aria-labelledby="organization-dialog-title"
    onCancel={(event) => { if (submitting.current) event.preventDefault(); }}
    onClose={() => { setError(""); setImageError(""); setTrophy(null); setPreview(""); form.current?.reset(); onClose(); }}>
    <button type="button" className="close-dialog" aria-label="Fechar cadastro de organização" disabled={pending} onClick={() => dialog.current?.close()}>×</button>
    <p className="eyebrow">SUA COMUNIDADE / ORGANIZAÇÕES</p>
    <h2 id="organization-dialog-title">{initial ? "Editar organização" : "Crie sua organização."}</h2>
    <p>{initial ? "Atualize o nome e a imagem do troféu da organização." : standalone ? "Cadastre sua liga ou comunidade com uma imagem de troféu opcional." : "Dê um nome à sua liga ou comunidade. Ela será cadastrada como ativa e selecionada neste campeonato."}</p>
    <form ref={form} onSubmit={async (event) => {
      event.preventDefault();
      if (submitting.current) return;
      if (imageError) return;
      const nome = String(new FormData(event.currentTarget).get("nome") || "").trim();
      if (!nome) { setError("Informe o nome da organização."); return; }
      submitting.current = true;
      setPending(true);
      setError("");
      try {
        let body: string | FormData = JSON.stringify({ nome, ativo: initial?.ativo ?? true });
        if (trophy) {
          body = new FormData();
          body.append("nome", nome);
          body.append("ativo", String(initial?.ativo ?? true));
          body.append("trofeu", trophy, trophy.name);
        }
        const response = await fetch(initial ? `/api/organizacoes/${initial.id}` : "/api/organizacoes", { method: initial ? "PUT" : "POST", headers: trophy ? undefined : { "Content-Type": "application/json" }, body });
        const result = await response.json();
        if (!response.ok) throw new Error([result.detail, ...Object.values(result.erros || {})].filter(Boolean).join(" ") || "Não foi possível cadastrar a organização.");
        if (!Number.isSafeInteger(result.id) || result.id <= 0 || typeof result.nome !== "string" || typeof result.ativo !== "boolean") throw new Error("A API não confirmou uma organização ativa válida. Consulte os cadastros antes de tentar novamente.");
        onCreated(result);
        dialog.current?.close();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar o cadastro. Verifique sua conexão."); }
      finally { submitting.current = false; setPending(false); }
    }}>
      <label htmlFor="organization-name">Nome da organização</label>
      <input ref={nameInput} id="organization-name" name="nome" defaultValue={initial?.nome || ""} placeholder="Ex.: Liga dos Amigos" required maxLength={255} pattern=".*\S.*" disabled={pending} autoFocus />
      <label htmlFor="organization-trophy">Imagem do troféu (opcional)</label>
      <input id="organization-trophy" type="file" accept="image/png,image/svg+xml,.png,.svg" disabled={pending} aria-describedby="organization-trophy-help" onChange={event => {
        const file = event.target.files?.[0];
        setImageError(""); setTrophy(null); setPreview("");
        if (!file) return;
        const type = file.type || (/\.svg$/i.test(file.name) ? "image/svg+xml" : /\.png$/i.test(file.name) ? "image/png" : "");
        if (!["image/png", "image/svg+xml"].includes(type) || file.size === 0 || file.size > 2 * 1024 * 1024) {
          setImageError("Selecione uma imagem PNG ou SVG de até 2 MB.");
          event.target.value = "";
          return;
        }
        setTrophy(file.type ? file : new File([file], file.name, { type }));
        setPreview(URL.createObjectURL(file));
      }} />
      <p id="organization-trophy-help">PNG ou SVG, até 2 MB.</p>
      {preview && <figure className="organization-trophy-preview">
        <Image src={preview} alt="Prévia do troféu da organização" width={160} height={160} unoptimized onError={() => setImageError("Não foi possível exibir a imagem. Selecione outro PNG ou SVG.")} />
        <figcaption>{trophy?.name}</figcaption>
      </figure>}
      {imageError && <p role="alert" className="form-error">{imageError}</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="organization-dialog-actions"><button type="button" className="retry-button" disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit" className="form-submit" disabled={pending || !!imageError}>{pending ? "Salvando…" : "Salvar organização ↗"}</button></div>
      {pending && <p role="status">Cadastrando organização…</p>}
    </form>
  </dialog>;
}

