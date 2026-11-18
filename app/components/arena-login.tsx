"use client";

import { useEffect, useRef, useState } from "react";

type User = { firstName: string; expiresAt: number };

export default function ArenaLogin() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function sync() {
      try {
        const response = await fetch("/api/auth", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setUser(data.user);
        setError("");
      } catch {
        if (!controller.signal.aborted) setError("Não foi possível consultar a sessão. Tente entrar novamente.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void sync();
    window.addEventListener("focus", sync);
    return () => { controller.abort(); window.removeEventListener("focus", sync); };
  }, []);
  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => setUser(null), Math.min(2147483647, Math.max(0, user.expiresAt - Date.now())));
    return () => window.clearTimeout(timer);
  }, [user]);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);

  async function logout() {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      const response = await fetch("/api/auth", { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).detail);
      setUser(null);
      window.dispatchEvent(new Event("arena-auth-change"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível sair. Tente novamente."); }
    finally { lock.current = false; setPending(false); }
  }

  return <>
    <div className="arena-account">
      {user && <p className="arena-account-name" title={user.firstName}>{user.firstName}</p>}
      <button type="button" className="sidebar-link arena-account-button" disabled={pending || loading} title={user ? "Sair" : "Entrar"} aria-label={user ? `Sair da conta de ${user.firstName}` : "Entrar"} onClick={() => {
        if (user) void logout();
        else { setError(""); setOpen(true); }
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>
        <span>{loading ? "Carregando…" : pending ? "Saindo…" : user ? "Sair" : "Entrar"}</span>
      </button>
      {!open && error && <p role="alert" className="arena-account-error">{error}</p>}
    </div>
    {open && <dialog ref={dialog} className="create-dialog" aria-labelledby="arena-login-title" onClose={() => { setOpen(false); setError(""); }} onCancel={event => { if (lock.current) event.preventDefault(); }}>
      <button className="close-dialog" type="button" aria-label="Fechar login" disabled={pending} onClick={() => dialog.current?.close()}>×</button>
      <p className="eyebrow">SUA ARENA</p><h2 id="arena-login-title">Entrar na Arena</h2>
      <form onSubmit={async event => {
        event.preventDefault(); if (lock.current) return;
        const form = new FormData(event.currentTarget);
        lock.current = true; setPending(true); setError("");
        try {
          const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.detail);
          setUser(data.user); window.dispatchEvent(new Event("arena-auth-change")); dialog.current?.close();
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível entrar. Tente novamente."); }
        finally { lock.current = false; setPending(false); }
      }}>
        <fieldset disabled={pending} className="arena-login-fields">
          <label htmlFor="arena-username">Usuário ou e-mail</label><input id="arena-username" name="username" autoComplete="username" required autoFocus />
          <label htmlFor="arena-password">Senha</label><input id="arena-password" name="password" type="password" autoComplete="current-password" required />
        </fieldset>
        {error && <p role="alert" className="arena-account-error">{error}</p>}
        <button type="submit" className="form-submit" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
      </form>
    </dialog>}
  </>;
}
