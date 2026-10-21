"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ui from "../jogadores/players.module.css";
import styles from "./x1.module.css";

type Player = { id: number; nome: string; apelido: string | null; ativo: boolean };
type Team = { id: number; nome: string; logoUrl: string; ativo: boolean };
type Participant = { id: number; jogador: Player; equipe: Team; ativo: boolean };
type Result = { golsMandante: number; golsVisitante: number; penaltisMandante: number | null; penaltisVisitante: number | null };
type Match = { id: number; numero: number; mandante: Participant; visitante: Participant; status: "AGENDADA" | "FINALIZADA" | "CANCELADA"; resultado: Result | null };
type Duel = { id: number; participanteUm: Participant; participanteDois: Participant; tipo: "MELHOR_DE_TRES" | "MELHOR_DE_CINCO"; encerrarAntecipadamente: boolean; status: "EM_ANDAMENTO" | "FINALIZADO"; vitoriasParticipanteUm: number; vitoriasParticipanteDois: number; vencedor: Participant | null; partidas: Match[] };
type Action = { kind: "create" } | { kind: "result"; duel: Duel; match: Match } | { kind: "finish"; duel: Duel };
const name = (value: Player | Participant): string => "jogador" in value ? `${name(value.jogador)} · ${value.equipe.nome}` : value.apelido?.trim() || value.nome;
const format = (duel: Duel) => duel.tipo === "MELHOR_DE_TRES" ? "Melhor de 3" : "Melhor de 5";

function MatchOpponent({ participant, away = false }: { participant: Participant; away?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const team = participant.equipe;
  const url = team.logoUrl?.trim();
  const usable = !!url && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url));
  return <div className={`${styles.opponent}${away ? ` ${styles.away}` : ""}`}>
    <span className="team-logo" title={team.nome}>
      {usable && failedUrl !== url ? <Image src={url} alt={`Logo de ${team.nome}`} width={44} height={44} unoptimized onError={() => setFailedUrl(url)} /> : <span className="team-logo-fallback" role="img" aria-label={`Equipe ${team.nome}, sem logo disponível`}>{team.nome.trim().slice(0, 2).toUpperCase()}</span>}
    </span>
    <span>{name(participant.jogador)}</span>
  </div>;
}
async function read(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error([data.detail, ...Object.values(data.erros || {})].filter(Boolean).join(" ") || "Não foi possível concluir a operação.");
  return data;
}

function ActionDialog({ action, onClose, onSaved }: { action: Action; onClose: () => void; onSaved: (duel: Duel) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(action.kind === "create");
  const [retry, setRetry] = useState(0);
  const [one, setOne] = useState("");
  const [two, setTwo] = useState("");
  const [teamOne, setTeamOne] = useState("");
  const [teamTwo, setTeamTwo] = useState("");
  const [type, setType] = useState("MELHOR_DE_TRES");
  const [early, setEarly] = useState(true);
  const result = action.kind === "result" ? action.match.resultado : null;
  const [home, setHome] = useState(result ? String(result.golsMandante) : "");
  const [away, setAway] = useState(result ? String(result.golsVisitante) : "");
  const [homePens, setHomePens] = useState(result?.penaltisMandante != null ? String(result.penaltisMandante) : "");
  const [awayPens, setAwayPens] = useState(result?.penaltisVisitante != null ? String(result.penaltisVisitante) : "");
  const tied = home !== "" && away !== "" && Number(home) === Number(away);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    if (action.kind !== "create") return;
    const controller = new AbortController();
    Promise.all([
      fetch("/api/jogadores", { signal: controller.signal }).then(read),
      fetch("/api/equipes", { signal: controller.signal }).then(read),
    ]).then(([playerData, teamData]) => {
      if (!Array.isArray(playerData) || !Array.isArray(teamData)) throw new Error("Listagem de jogadores ou equipes inválida.");
      if (!controller.signal.aborted) {
        setPlayers(playerData.filter((player: Player) => player.ativo));
        setTeams(teamData.filter((team: Team) => team.ativo));
      }
    }).catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Erro ao carregar jogadores e equipes."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [action.kind, retry]);
  return <dialog ref={dialog} className={`${ui.dialog} ${styles.dialog}${action.kind === "create" ? ` ${styles.createDialog}` : ""}`} onClose={onClose} onCancel={(event) => { if (lock.current) event.preventDefault(); }} aria-labelledby="x1-dialog-title">
    <button type="button" className={ui.close} disabled={pending} aria-label="Fechar" onClick={() => dialog.current?.close()}>×</button>
    <p className="eyebrow">SUA ARENA / X1</p><h2 id="x1-dialog-title">{action.kind === "create" ? "Comece uma rivalidade" : action.kind === "finish" ? "Encerrar a série?" : `Resultado · partida ${action.match.numero}`}</h2>
    <form onSubmit={async (event) => {
      event.preventDefault(); if (lock.current) return;
      if (action.kind === "result" && tied && (homePens !== "" || awayPens !== "") && (homePens === "" || awayPens === "" || Number(homePens) === Number(awayPens))) { setError("Preencha os dois placares de pênaltis com um vencedor ou deixe ambos em branco para manter o empate."); return; }
      lock.current = true; setPending(true); setError("");
      try {
        const path = action.kind === "create" ? "/api/x1" : action.kind === "finish" ? `/api/x1/${action.duel.id}/encerrar` : `/api/x1/${action.duel.id}/partidas/${action.match.id}/resultado`;
        const body = action.kind === "create" ? { participanteUm: { jogadorId: Number(one), equipeId: Number(teamOne) }, participanteDois: { jogadorId: Number(two), equipeId: Number(teamTwo) }, tipo: type, encerrarAntecipadamente: early } : action.kind === "result" ? { golsMandante: Number(home), golsVisitante: Number(away), penaltisMandante: tied && homePens !== "" ? Number(homePens) : null, penaltisVisitante: tied && awayPens !== "" ? Number(awayPens) : null } : null;
        const data = await read(await fetch(path, { method: action.kind === "result" ? "PUT" : "POST", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) }));
        if (!data || !Number.isSafeInteger(data.id) || !Array.isArray(data.partidas)) throw new Error("A API não confirmou a operação. Atualize a listagem antes de tentar novamente.");
        onSaved(data); onClose();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a operação. Atualize a listagem."); }
      finally { lock.current = false; setPending(false); }
    }}>
      <fieldset className={`${ui.fields} ${styles.fields}`} disabled={pending || loading}>
        {action.kind === "create" ? <>
          <p className={ui.description}>Dois jogadores. Uma série. Quem leva a melhor?</p>
          <div className={styles.contenders}><div className={styles.contender} role="group" aria-label="Jogador 1 e equipe">
          <label htmlFor="x1-one">Jogador 1 · primeiro mandante</label><select id="x1-one" required value={one} onChange={(event) => setOne(event.target.value)}><option value="">Selecione o desafiante</option>{players.map((player) => <option key={player.id} value={player.id} disabled={String(player.id) === two}>{name(player)}</option>)}</select>
          <label htmlFor="x1-team-one">Equipe do jogador 1</label><select id="x1-team-one" required value={teamOne} onChange={(event) => setTeamOne(event.target.value)}><option value="">Selecione a equipe do desafiante</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.nome}</option>)}</select>
          </div><span className={styles.vs} aria-hidden="true">VS</span><div className={styles.contender} role="group" aria-label="Jogador 2 e equipe">
          <label htmlFor="x1-two">Jogador 2</label><select id="x1-two" required value={two} onChange={(event) => setTwo(event.target.value)}><option value="">Selecione o adversário</option>{players.map((player) => <option key={player.id} value={player.id} disabled={String(player.id) === one}>{name(player)}</option>)}</select>
          <label htmlFor="x1-team-two">Equipe do jogador 2</label><select id="x1-team-two" required value={teamTwo} onChange={(event) => setTeamTwo(event.target.value)}><option value="">Selecione a equipe do adversário</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.nome}</option>)}</select>
          </div></div>
          <label htmlFor="x1-type">Formato da série</label><select id="x1-type" value={type} onChange={(event) => setType(event.target.value)}><option value="MELHOR_DE_TRES">Melhor de 3 · 2 vitórias para vencer</option><option value="MELHOR_DE_CINCO">Melhor de 5 · 3 vitórias para vencer</option></select>
          <label className={styles.check}><input type="checkbox" checked={early} onChange={(event) => setEarly(event.target.checked)} /> Encerrar ao atingir as vitórias necessárias</label><p className={ui.description}>O mando alterna a cada partida. Com a opção desmarcada, todas as partidas serão disputadas.</p>
        </> : action.kind === "finish" ? <p className={ui.description}>A série entre <strong>{name(action.duel.participanteUm)}</strong> e <strong>{name(action.duel.participanteDois)}</strong> já tem um vencedor definido. As partidas restantes serão canceladas.</p> : <>
          <p className={ui.description}>Registre o placar respeitando o mando desta partida.</p>
          <div className={styles.scoreInputs}><label htmlFor="x1-home">{name(action.match.mandante)}<small>Mandante</small><input id="x1-home" type="number" min="0" max="2147483647" required value={home} onChange={(event) => setHome(event.target.value)} /></label><span>×</span><label htmlFor="x1-away">{name(action.match.visitante)}<small>Visitante</small><input id="x1-away" type="number" min="0" max="2147483647" required value={away} onChange={(event) => setAway(event.target.value)} /></label></div>
          {tied && <><p className={ui.description}>Pênaltis opcionais: deixe ambos os campos em branco para manter o empate.</p><div className={styles.scoreInputs}><label htmlFor="x1-home-pens">Pênaltis mandante<input id="x1-home-pens" type="number" min="0" max="2147483647" value={homePens} onChange={(event) => setHomePens(event.target.value)} /></label><span>×</span><label htmlFor="x1-away-pens">Pênaltis visitante<input id="x1-away-pens" type="number" min="0" max="2147483647" value={awayPens} onChange={(event) => setAwayPens(event.target.value)} /></label></div></>}
        </>}
      </fieldset>
      {loading && <p role="status" className={ui.description}>Carregando jogadores e equipes…</p>}
      {action.kind === "create" && !loading && players.length < 2 && <p className={ui.description}>São necessários dois jogadores ativos. <Link href="/jogadores">Gerenciar jogadores ↗</Link></p>}
      {error && <div role="alert" className={ui.error}>{error}{action.kind === "create" && (!players.length || !teams.length) && <button type="button" className={ui.secondary} onClick={() => { setLoading(true); setError(""); setRetry((value) => value + 1); }}>Tentar novamente</button>}</div>}
      {action.kind === "create" && !loading && !teams.length && <p className={ui.description}>Cadastre ou ative uma equipe para criar o confronto. <Link href="/equipes">Gerenciar equipes ↗</Link></p>}
      <div className={ui.dialogActions}><button type="button" className={ui.secondary} disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button><button className={ui.primary} type="submit" disabled={pending || loading || (action.kind === "create" && (!one || !two || !teamOne || !teamTwo || one === two))}>{pending ? "Salvando…" : action.kind === "create" ? "Criar X1 ↗" : action.kind === "finish" ? "Encerrar série" : "Salvar resultado"}</button></div>
    </form>
  </dialog>;
}

export default function X1Manager() {
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [filter, setFilter] = useState("TODOS");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/x1", { signal: controller.signal }).then(read).then((data) => {
      if (!Array.isArray(data)) throw new Error("A API retornou uma listagem inválida.");
      if (!controller.signal.aborted) setDuels(data);
    }).catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os confrontos."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  const refresh = () => { setLoading(true); setError(""); setReload((value) => value + 1); };
  const ongoing = duels.filter((duel) => duel.status === "EM_ANDAMENTO").length;
  const visible = duels.filter((duel) => (filter === "TODOS" || duel.status === filter) && `${name(duel.participanteUm)} ${duel.participanteUm.jogador.nome} ${name(duel.participanteDois)} ${duel.participanteDois.jogador.nome} ${duel.id}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))).sort((a, b) => b.id - a.id);
  return <main className="resource-page"><p className="eyebrow">FUTEBOL COMPETITIVO / SUA ARENA</p><div className="resource-heading"><div><h1>X1</h1><p>O palco é de vocês. Crie o desafio e decida a rivalidade em campo.</p></div><button className={ui.primary} onClick={() => { setNotice(""); setAction({ kind: "create" }); }}>+ Novo X1</button></div>
    <section className={styles.banner} aria-label="Resumo dos confrontos"><div><p className="eyebrow">FRENTE A FRENTE</p><h2>Cada partida conta.<br /><span>Cada vitória tem dono.</span></h2><p>Séries de 3 ou 5 partidas, mando alternado e uma rivalidade para acompanhar.</p></div><div className={styles.stats}><div><strong>{loading || error ? "—" : ongoing}</strong><span>Em andamento</span></div><div><strong>{loading || error ? "—" : duels.length - ongoing}</strong><span>Finalizados</span></div></div></section>
    {notice && <p role="status" className={ui.notice}>{notice}</p>}
    <div className={styles.toolbar}><div className={styles.filters} role="group" aria-label="Filtrar confrontos">{[["TODOS", "Todos"], ["EM_ANDAMENTO", "Em andamento"], ["FINALIZADO", "Finalizados"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><label className={styles.search}>Buscar confronto<input placeholder="Jogador, equipe ou número do X1" value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className={ui.secondary} disabled={loading} onClick={refresh}>Atualizar</button></div>
    {loading && <p role="status" className="form-note">Carregando confrontos…</p>}
    {error && <div role="alert" className={ui.error}>{error}<button className={ui.secondary} onClick={refresh}>Tentar novamente</button></div>}
    {!loading && !error && !visible.length && <div className={styles.empty}><span>×</span><h2>{duels.length ? "Nenhum confronto encontrado" : "A próxima rivalidade começa aqui"}</h2><p>{duels.length ? "Ajuste a busca ou o filtro para encontrar seu X1." : "Escolha dois jogadores e crie o primeiro desafio da arena."}</p>{!duels.length && <button className={ui.primary} onClick={() => setAction({ kind: "create" })}>Criar primeiro X1</button>}</div>}
    {!loading && !error && <div className={styles.grid}>{visible.map((duel) => {
      const expanded = selected === duel.id;
      const matches = [...duel.partidas].sort((a, b) => a.numero - b.numero);
      const next = matches.find((match) => match.status === "AGENDADA");
      const majority = duel.tipo === "MELHOR_DE_TRES" ? 2 : 3;
      const winner = duel.status === "FINALIZADO" ? duel.vencedor : null;
      return <article key={duel.id} className={styles.card}><div className={styles.cardHeader}><span className="eyebrow">X1 #{duel.id} · {format(duel)}</span><span className={duel.status === "FINALIZADO" ? styles.finished : styles.live}>{duel.status === "FINALIZADO" ? "Finalizado" : "Em andamento"}</span></div>
        <div className={styles.versus}><div className={`${styles.participant}${winner?.id === duel.participanteUm.id ? ` ${styles.winningPlayer}` : ""}`} aria-label={winner?.id === duel.participanteUm.id ? `Vencedor: ${name(duel.participanteUm)}` : undefined}><span className={styles.avatar}>{name(duel.participanteUm).slice(0, 2).toUpperCase()}</span><h3>{name(duel.participanteUm)}</h3></div><div className={styles.score}><strong>{duel.vitoriasParticipanteUm}<small>:</small>{duel.vitoriasParticipanteDois}</strong><span>VITÓRIAS</span></div><div className={`${styles.participant}${winner?.id === duel.participanteDois.id ? ` ${styles.winningPlayer}` : ""}`} aria-label={winner?.id === duel.participanteDois.id ? `Vencedor: ${name(duel.participanteDois)}` : undefined}><span className={styles.avatar}>{name(duel.participanteDois).slice(0, 2).toUpperCase()}</span><h3>{name(duel.participanteDois)}</h3></div></div>
        <div className={styles.progress} aria-label="Progresso das partidas">{matches.map((match) => <span key={match.id} data-status={match.status} title={`Partida ${match.numero}: ${match.status === "FINALIZADA" ? "finalizada" : match.status === "CANCELADA" ? "cancelada" : "agendada"}`} />)}</div>
        {!winner && <p className={styles.summary}>{duel.status === "FINALIZADO" ? "Série encerrada · empate" : `Próxima: partida ${next?.numero ?? "—"} · ${majority} vitórias para vencer`}</p>}
        <div className={styles.actions}><button className={ui.secondary} aria-expanded={expanded} aria-controls={`x1-matches-${duel.id}`} onClick={() => setSelected(expanded ? null : duel.id)}>{expanded ? "Recolher partidas ↑" : "Acompanhar série ↓"}</button>{next && <button className={ui.primary} onClick={() => setAction({ kind: "result", duel, match: next })}>Incluir resultado</button>}</div>
        {expanded && <section id={`x1-matches-${duel.id}`} className={styles.matches} aria-label={`Partidas do X1 ${duel.id}`}><p className={ui.description}>{duel.encerrarAntecipadamente ? "Encerramento automático ao atingir a maioria das vitórias." : "Todas as partidas serão disputadas, salvo encerramento antecipado."}</p>{matches.map((match) => <div key={match.id} className={styles.match}><div className={styles.matchDetails}><small>PARTIDA {match.numero} · {match.status === "CANCELADA" ? "Cancelada" : match.status === "FINALIZADA" ? "Finalizada" : "Agendada"}</small><div className={styles.matchScore}><MatchOpponent participant={match.mandante} /><strong>{match.resultado ? `${match.resultado.golsMandante} × ${match.resultado.golsVisitante}` : "×"}</strong><MatchOpponent participant={match.visitante} away /></div>{match.resultado?.penaltisMandante != null && <small>Pênaltis: {match.resultado.penaltisMandante} × {match.resultado.penaltisVisitante}</small>}</div>{match.status !== "CANCELADA" && (match.status === "FINALIZADA" || match.id === next?.id) && <button className={ui.secondary} onClick={() => setAction({ kind: "result", duel, match })}>{match.resultado ? "Editar" : "Registrar"}</button>}</div>)}{duel.status === "EM_ANDAMENTO" && Math.max(duel.vitoriasParticipanteUm, duel.vitoriasParticipanteDois) >= majority && <button className={ui.primary} onClick={() => setAction({ kind: "finish", duel })}>Encerrar série antecipadamente</button>}</section>}
      </article>;
    })}</div>}
    {action && <ActionDialog action={action} onClose={() => setAction(null)} onSaved={(duel) => { setDuels((previous) => [...previous.filter((item) => item.id !== duel.id), duel]); setSelected(duel.id); setNotice(action.kind === "create" ? "X1 criado. A arena está pronta!" : action.kind === "finish" ? "Série encerrada com sucesso." : "Resultado salvo e placar da série atualizado."); }} />}
  </main>;
}
