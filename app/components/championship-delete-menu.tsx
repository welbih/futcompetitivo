"use client";

import { useRef, useState } from "react";

export default function ChampionshipDeleteMenu({ id, name, onDeleted, resource = "campeonatos" }: { id: number; name: string; onDeleted: () => void; resource?: "campeonatos" | "x1" }) {
  const label = resource === "x1" ? "X1" : "campeonato";
  const dialogId = `delete-${resource}-${id}`;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const menu = useRef<HTMLDetailsElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);

  async function remove() {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`/api/${resource}/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || `Não foi possível apagar o ${label}.`);
      }
      onDeleted();
    } catch (cause) { setError(cause instanceof Error ? cause.message : `Não foi possível apagar o ${label}. Tente novamente.`); }
    finally { lock.current = false; setPending(false); }
  }

  return <>
    <details ref={menu} className="championship-card-menu">
      <summary aria-label={`Opções de ${name}`} title={`Opções do ${label}`}>⋮</summary>
      <div><button type="button" disabled={pending} onClick={() => {
        if (menu.current) menu.current.open = false;
        setError("");
        dialog.current?.showModal();
      }}>Apagar</button></div>
    </details>
    <dialog ref={dialog} className="create-dialog" aria-labelledby={dialogId} aria-describedby={`${dialogId}-description`} onCancel={event => { if (lock.current) event.preventDefault(); }}>
      <button type="button" className="close-dialog" aria-label="Fechar confirmação" disabled={pending} onClick={() => dialog.current?.close()}>×</button>
      <p className="eyebrow">EXCLUIR {label.toUpperCase()}</p>
      <h2 id={dialogId}>Apagar {label}?</h2>
      <p id={`${dialogId}-description`}>Deseja apagar <strong>{name}</strong>? Esta ação exclui o {label} e não pode ser desfeita.</p>
      {error && <p role="alert" className="championship-delete-error">{error}</p>}
      <div className="organization-dialog-actions championship-delete-actions">
        <button type="button" className="retry-button" autoFocus disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button>
        <button type="button" className="form-submit" disabled={pending} onClick={() => void remove()}>{pending ? "Apagando…" : "Apagar"}</button>
      </div>
      {pending && <p role="status">Apagando {label}…</p>}
    </dialog>
  </>;
}
