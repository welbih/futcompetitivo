"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./players.module.css";

type Player = { id: number; nome: string; apelido: string | null; ativo: boolean };
type Action = { kind: "create" } | { kind: "edit" | "deactivate"; player: Player };

async function readResponse(response: Response) {
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error([result.detail, ...Object.values(result.erros || {})].filter(Boolean).join(" ") || "Não foi possível concluir a operação.");
  return result;
}

function PlayerDialog({ action, onClose, onSaved, onDeactivated }: { action: Action; onClose: () => void; onSaved: (player: Player) => void; onDeactivated: (id: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const player = action.kind === "create" ? null : action.player;
  const [name, setName] = useState(player?.nome || "");
  const [nickname, setNickname] = useState(player?.apelido || "");
  const deactivate = action.kind === "deactivate";

  useEffect(() => { dialog.current?.showModal(); }, []);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="player-dialog-title" onClose={onClose} onCancel={(event) => { if (lock.current) event.preventDefault(); }}>
    <button type="button" className={styles.close} aria-label="Fechar" disabled={pending} onClick={() => dialog.current?.close()}>×</button>
    <p className="eyebrow">FUTEBOL COMPETITIVO / JOGADOR</p><h2 id="player-dialog-title">{deactivate ? "Inativar jogador?" : player ? "Editar jogador" : "Novo jogador"}</h2>
    <form onSubmit={async (event) => {
      event.preventDefault();
      if (lock.current || (!deactivate && !name.trim())) return;
      lock.current = true; setPending(true); setError("");
      try {
        const response = await fetch(player ? `/api/jogadores/${player.id}` : "/api/jogadores", {
          method: deactivate ? "DELETE" : player ? "PUT" : "POST",
          ...(deactivate ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: name.trim(), apelido: nickname.trim() || null }) }),
        });
        const result = await readResponse(response);
        if (deactivate && player) onDeactivated(player.id);
        else {
          if (!result || !Number.isSafeInteger(result.id) || typeof result.nome !== "string") throw new Error("Não foi possível confirmar o cadastro. Atualize a listagem antes de tentar novamente.");
          onSaved(result);
        }
        onClose();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a operação. Atualize a listagem antes de tentar novamente."); }
      finally { lock.current = false; setPending(false); }
    }}>
      {deactivate ? <p className={styles.description}>Deseja inativar <strong>{player?.apelido || player?.nome}</strong>? Ele permanecerá na listagem como inativo e não poderá ser incluído em novos campeonatos. O histórico será preservado.</p> : <fieldset disabled={pending} className={styles.fields}>
        <label htmlFor="player-name">Nome <span>*</span></label><input id="player-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do jogador" required maxLength={255} pattern=".*\S.*" autoFocus />
        <label htmlFor="player-nickname">Apelido <span className={styles.optional}>(opcional)</span></label><input id="player-nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Como ele é conhecido na arena" maxLength={255} />
      </fieldset>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.dialogActions}><button type="button" className={styles.secondary} disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit" className={deactivate ? styles.danger : styles.primary} disabled={pending || (!deactivate && !name.trim())}>{pending ? "Salvando…" : deactivate ? "Inativar jogador" : "Salvar jogador"}</button></div>
      {pending && <p role="status" className={styles.description}>Processando…</p>}
    </form>
  </dialog>;
}

export default function PlayersManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [reload, setReload] = useState(0);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const activationLock = useRef(false);

  async function activatePlayer(player: Player) {
    if (activationLock.current) return;
    activationLock.current = true; setActivatingId(player.id); setError(""); setNotice("");
    try {
      const result = await readResponse(await fetch(`/api/jogadores/${player.id}/ativar`, { method: "PUT" }));
      if (!result || result.id !== player.id || result.ativo !== true) throw new Error("A API não confirmou a ativação. Atualize a listagem antes de tentar novamente.");
      setPlayers((previous) => previous.map((item) => item.id === player.id ? result : item));
      setNotice("Jogador ativado com sucesso.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a ativação. Atualize a listagem."); }
    finally { activationLock.current = false; setActivatingId(null); }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/jogadores", { signal: controller.signal }).then(readResponse).then((data) => {
      if (!Array.isArray(data)) throw new Error("A API retornou uma listagem inválida.");
      if (!controller.signal.aborted) setPlayers(data);
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os jogadores."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  return <main className="resource-page"><p className="eyebrow">FUTEBOL COMPETITIVO / SUA ARENA</p><div className="resource-heading"><div><h1>Jogador</h1><p>Cadastre e gerencie os jogadores que fazem parte da sua arena.</p></div><button type="button" className={styles.primary} onClick={() => { setNotice(""); setAction({ kind: "create" }); }}>+ Novo jogador</button></div>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {loading && <p role="status" className="form-note">Carregando jogadores…</p>}
    {error && <div role="alert" className={styles.error}><p>{error}</p><button type="button" className={styles.secondary} onClick={() => { setLoading(true); setError(""); setReload((value) => value + 1); }}>Atualizar listagem</button></div>}
    {!loading && !error && !players.length && <p className="resource-empty">Nenhum jogador cadastrado. Clique em Novo jogador para começar.</p>}
    <div className="resource-grid">{players.map((player) => <article key={player.id} className={styles.card}><span className="eyebrow">#{player.id}</span><h2>{player.apelido?.trim() || player.nome}</h2>{player.apelido && <p>{player.nome}</p>}<span className={player.ativo ? styles.active : styles.inactive}>{player.ativo ? "Ativo" : "Inativo"}</span><div className={styles.cardActions}>{player.ativo ? <><button type="button" className={styles.secondary} disabled={activatingId !== null} aria-label={`Editar ${player.apelido || player.nome}`} onClick={() => { setNotice(""); setAction({ kind: "edit", player }); }}>Editar</button><button type="button" className={styles.deactivate} disabled={activatingId !== null} aria-label={`Inativar ${player.apelido || player.nome}`} onClick={() => { setNotice(""); setAction({ kind: "deactivate", player }); }}>Inativar</button></> : <button type="button" className={styles.primary} disabled={activatingId !== null} aria-label={`Ativar ${player.apelido || player.nome}`} onClick={() => activatePlayer(player)}>{activatingId === player.id ? "Ativando…" : "Ativar"}</button>}</div></article>)}</div>
    {action && <PlayerDialog key={action.kind === "create" ? "create" : `${action.kind}-${action.player.id}`} action={action} onClose={() => setAction(null)} onSaved={(player) => {
      setPlayers((previous) => [...previous.filter((item) => item.id !== player.id), player].sort((a, b) => a.id - b.id));
      setNotice(action.kind === "create" ? "Jogador criado com sucesso." : "Jogador atualizado com sucesso.");
    }} onDeactivated={(id) => { setPlayers((previous) => previous.map((player) => player.id === id ? { ...player, ativo: false } : player)); setNotice("Jogador inativado com sucesso."); }} />}
  </main>;
}


