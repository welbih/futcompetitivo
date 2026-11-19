"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlayerJersey from "../../components/player-jersey";
import styles from "./statistics.module.css";

type Player = { id: number; nome: string; apelido: string | null };
type Team = { id: number; nome: string; logoUrl: string | null };
type Origin = "TODOS" | "CAMPEONATO" | "X1";
type MatchRecord = {
  partidaId: number; adversario: Player; equipeJogador: Team | null; equipeAdversario: Team | null;
  golsMarcados: number; golsSofridos: number; saldoGols: number;
  penaltis: { jogador: number; adversario: number } | null;
  origem: "CAMPEONATO" | "X1";
  competicao: { id: number; nome: string; organizacao: { id: number; nome: string } | null; edicao: number | null };
  rodada: { numero: number } | null;
  fase: { tipo: string; etapa: { codigo: string; nome: string } | null } | null;
  idaOuVolta: "IDA" | "VOLTA" | "JOGO_UNICO" | null; numeroPartida: number | null; dataPartida: string | null;
};
type Rival = { adversario: Player; totalConfrontos: number; vitorias: number; empates: number; derrotas: number };
type Statistics = {
  jogador: Player; origem: Origin;
  resumo: { partidasDisputadas: number; vitorias: number; empates: number; derrotas: number; golsMarcados: number; golsSofridos: number; saldoGols: number };
  maioresGoleadasAplicadasPorGols: MatchRecord[]; maioresGoleadasAplicadasPorSaldo: MatchRecord[];
  maioresGoleadasSofridasPorGols: MatchRecord[]; maioresGoleadasSofridasPorSaldo: MatchRecord[];
  maioresFregueses: Rival[]; maioresCarrascos: Rival[];
};

const name = (player: Player) => player.apelido?.trim() || player.nome;
const signed = (value: number) => value > 0 ? `+${value}` : String(value);

function TeamLogo({ team }: { team: Team | null }) {
  const [failed, setFailed] = useState(false);
  return <span className={styles.logo}>{team?.logoUrl && !failed
    // Team logos are external assets supplied by the API.
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={team.logoUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
    : <span aria-hidden="true">{team?.nome.charAt(0) || "FC"}</span>}</span>;
}

function RecordMatch({ match, player }: { match: MatchRecord; player: Player }) {
  const competition = match.origem === "CAMPEONATO" && match.competicao.organizacao
    ? `Campeonato ${match.competicao.organizacao.nome}${match.competicao.edicao != null ? ` · ${match.competicao.edicao}ª edição` : ""}`
    : match.origem === "X1" ? "Desafio X1" : match.competicao.nome;
  const context = [match.fase?.etapa?.nome || (match.fase?.tipo === "LIGA" ? "Liga" : match.fase?.tipo === "ELIMINATORIA" ? "Mata a mata" : null), match.rodada && `${match.rodada.numero}ª rodada`, match.numeroPartida != null && `Jogo ${match.numeroPartida}`, match.idaOuVolta && ({ IDA: "Ida", VOLTA: "Volta", JOGO_UNICO: "Jogo único" }[match.idaOuVolta])].filter(Boolean).join(" · ");
  return <article className={styles.match}>
    <div className={styles.scoreline}>
      <div className={styles.opponent}><TeamLogo key={match.equipeJogador?.logoUrl} team={match.equipeJogador} /><strong>{name(player)}</strong>{match.equipeJogador && <small>{match.equipeJogador.nome}</small>}</div>
      <div className={styles.score}><strong aria-label={`${match.golsMarcados} a ${match.golsSofridos}`}>{match.golsMarcados} <span>×</span> {match.golsSofridos}</strong><small>Saldo {signed(match.saldoGols)}</small></div>
      <div className={styles.opponent}><TeamLogo key={match.equipeAdversario?.logoUrl} team={match.equipeAdversario} /><Link href={`/jogadores/${match.adversario.id}`}>{name(match.adversario)}</Link>{match.equipeAdversario && <small>{match.equipeAdversario.nome}</small>}</div>
    </div>
    {match.penaltis && <p className={styles.penalties}>Pênaltis: {match.penaltis.jogador} × {match.penaltis.adversario}</p>}
    <div className={styles.context}><Link href={match.origem === "CAMPEONATO" ? `/campeonatos/${match.competicao.id}` : "/x1"}>{competition} <span aria-hidden="true">↗</span></Link>{context && <p>{context}</p>}{match.dataPartida && <p>{new Date(match.dataPartida).toLocaleDateString("pt-BR")}</p>}</div>
  </article>;
}

function RivalRecords({ title, rivals, kind }: { title: string; rivals: Rival[]; kind: "vitorias" | "derrotas" }) {
  return <section className={styles.record}><div className={styles.sectionHeading}><p className="eyebrow">CONFRONTOS DIRETOS</p><h2>{title}</h2><p>{kind === "vitorias" ? "Contra quem mais venceu" : "Contra quem mais perdeu"}</p></div>
    {!rivals.length ? <p className={styles.empty}>Nenhuma {kind === "vitorias" ? "vitória" : "derrota"} registrada neste filtro.</p> : <ul className={styles.rivals}>{rivals.map(rival => <li key={rival.adversario.id}><div className={styles.rivalHeading}><Link href={`/jogadores/${rival.adversario.id}`}>{name(rival.adversario)}</Link><strong>{rival[kind]} <small>{kind === "vitorias" ? "vitórias" : "derrotas"}</small></strong></div><p>{rival.totalConfrontos} {rival.totalConfrontos === 1 ? "confronto" : "confrontos"}</p><dl className={styles.rivalStats}><div><dt>Vitórias</dt><dd>{rival.vitorias}</dd></div><div><dt>Empates</dt><dd>{rival.empates}</dd></div><div><dt>Derrotas</dt><dd>{rival.derrotas}</dd></div></dl></li>)}</ul>}
  </section>;
}

export default function PlayerStatistics({ id }: { id: string }) {
  const [origin, setOrigin] = useState<Origin>("TODOS");
  const [result, setResult] = useState<{ id: string; origin: Origin; data?: Statistics; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/jogadores/${id}/estatisticas?origem=${origin}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(response.status === 404 ? "Jogador não encontrado." : data.detail || "Não foi possível carregar as estatísticas.");
        const categories = ["maioresGoleadasAplicadasPorGols", "maioresGoleadasAplicadasPorSaldo", "maioresGoleadasSofridasPorGols", "maioresGoleadasSofridasPorSaldo", "maioresFregueses", "maioresCarrascos"];
        if (!data.jogador || !data.resumo || categories.some(key => !Array.isArray(data[key]))) throw new Error("A API retornou estatísticas inválidas.");
        return data as Statistics;
      }).then(data => { if (!controller.signal.aborted) setResult({ id, origin, data }); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setResult({ id, origin, error: error instanceof Error ? error.message : "Não foi possível carregar as estatísticas." }); });
    return () => controller.abort();
  }, [id, origin, retry]);
  const current = result?.id === id && result.origin === origin ? result : null;
  const data = current?.data;
  const player = result?.id === id ? result.data?.jogador : undefined;
  const metrics = data ? [["Partidas", data.resumo.partidasDisputadas], ["Vitórias", data.resumo.vitorias], ["Empates", data.resumo.empates], ["Derrotas", data.resumo.derrotas], ["Gols marcados", data.resumo.golsMarcados], ["Gols sofridos", data.resumo.golsSofridos], ["Saldo de gols", signed(data.resumo.saldoGols)]] : [];
  const records = data ? [
    { title: "Maior goleada aplicada", criterion: "Por gols marcados", matches: data.maioresGoleadasAplicadasPorGols },
    { title: "Maior goleada aplicada", criterion: "Por diferença de gols", matches: data.maioresGoleadasAplicadasPorSaldo },
    { title: "Maior goleada sofrida", criterion: "Por gols sofridos", matches: data.maioresGoleadasSofridasPorGols },
    { title: "Maior goleada sofrida", criterion: "Por diferença de gols", matches: data.maioresGoleadasSofridasPorSaldo },
  ] : [];
  return <main className={`resource-page ${styles.page}`}>
    <Link className={styles.back} href="/jogadores">← Jogadores</Link>
    <header className={styles.hero}>{player && <div className={styles.shirt}><PlayerJersey player={player} compact /></div>}<div><p className="eyebrow">DESEMPENHO NA ARENA</p><h1>{player ? name(player) : "Estatísticas do jogador"}</h1>{player?.apelido && <p>{player.nome}</p>}<p>Resultados, recordes e rivalidades.</p></div></header>
    <div className={styles.filters} role="group" aria-label="Origem das estatísticas">{([ ["TODOS", "Geral"], ["CAMPEONATO", "Campeonatos"], ["X1", "X1"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={origin === value} onClick={() => setOrigin(value)}>{label}</button>)}</div>
    <div aria-busy={!current}>
      {!current && <p role="status" className={styles.message}>Carregando estatísticas…</p>}
      {current?.error && <div role="alert" className={styles.message}><p>{current.error}</p><button type="button" onClick={() => { setResult(null); setRetry(value => value + 1); }}>Tentar novamente</button></div>}
      {data && <><section aria-labelledby="summary-title"><h2 id="summary-title" className={styles.summaryTitle}>Em números</h2><dl className={styles.metrics}>{metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
        {!data.resumo.partidasDisputadas && <p className={styles.message}>Este jogador ainda não tem partidas finalizadas {origin === "CAMPEONATO" ? "em campeonatos" : origin === "X1" ? "no X1" : "no histórico"}.</p>}
        <div className={styles.records}>{records.map(record => <section key={`${record.title}-${record.criterion}`} className={styles.record}><div className={styles.sectionHeading}><p className="eyebrow">{record.criterion}</p><h2>{record.title}</h2>{record.matches.length > 1 && <p>{record.matches.length} partidas empatadas neste recorde</p>}</div>{record.matches.length ? record.matches.map(match => <RecordMatch key={match.partidaId} match={match} player={data.jogador} />) : <p className={styles.empty}>Nenhuma {record.title.includes("aplicada") ? "vitória" : "derrota"} registrada neste filtro.</p>}</section>)}
          <RivalRecords title="Maior freguês" rivals={data.maioresFregueses} kind="vitorias" /><RivalRecords title="Maior carrasco" rivals={data.maioresCarrascos} kind="derrotas" />
        </div><p className={styles.note}>Somente partidas finalizadas. Ida e volta contam separadamente. Pênaltis não entram nos gols; um empate decidido nos pênaltis continua como empate nas estatísticas. Todos os empates nos recordes são exibidos.</p>
      </>}
    </div>
  </main>;
}
