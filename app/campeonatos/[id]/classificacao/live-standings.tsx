"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useChampionshipLive } from "../use-championship-live";
import ChampionshipStandings from "../championship-standings";
import GroupStandings from "../group-standings";
import styles from "./standings.module.css";

export default function LiveStandings() {
  const { id } = useParams<{ id: string }>();
  const { championship, status, error, removed } = useChampionshipLive(id);
  const back = <Link className={styles.back} href={`/campeonatos/${id}`}>← Voltar ao campeonato</Link>;
  if (removed) return <main className={styles.page}><h1>Campeonato removido</h1><p>A transmissão foi encerrada.</p><Link className={styles.back} href="/campeonatos">← Campeonatos</Link></main>;
  if (!championship) return <main className={styles.page}>{back}<p role={error ? "alert" : "status"}>{error || "Carregando classificação ao vivo…"}</p>{error && <p>Uma nova tentativa será feita automaticamente.</p>}</main>;
  const phases = championship.fases?.filter(phase => ["LIGA", "SWISS", "GRUPOS"].includes(phase.tipo)) || [];
  const groups = phases.filter(phase => phase.tipo === "GRUPOS");
  const league = phases.filter(phase => phase.tipo !== "GRUPOS");
  const rounds = league.flatMap(phase => phase.rodadas.filter(round => round.status !== "PENDENTE"));
  const stageComplete = phases.length > 0 && phases.every(phase => phase.rodadas.length > 0 && phase.rodadas.every(round => round.status === "FINALIZADA"));
  const qualifiedCount = phases.find(phase => phase.quantidadeClassificados != null)?.quantidadeClassificados ?? undefined;
  const qualifierIds = [...new Set(championship.fases?.filter(phase => phase.tipo === "ELIMINATORIA").flatMap(phase => phase.confrontos || []).flatMap(tie => [tie.participanteUmId, tie.participanteDoisId]).filter((value): value is number => value != null))];
  return <main className={styles.page}>
    <header className={styles.header}><div>{back}<p className="eyebrow">CLASSIFICAÇÃO AO VIVO</p><h1>Campeonato {championship.organizacao.nome}</h1><p>{championship.edicao}ª edição · {championship.participantes.length} participantes{championship.status === "FINALIZADO" ? " · Finalizado" : ""}</p></div><p role="status" className={styles.connection} data-live={status === "live"}>{status === "live" ? "● Conectado ao vivo" : status === "sync-error" ? "Sincronização pendente — tentando novamente…" : status === "reconnecting" ? "Reconectando…" : "Conectando…"}</p></header>
    {error && <p role="alert" className="form-error">{error} Os dados exibidos são os últimos recebidos.</p>}
    {!phases.length ? <p className={styles.empty}>{championship.status === "CRIADO" ? "A classificação ficará disponível após o início do campeonato." : "Este campeonato é eliminatório e não possui tabela de classificação."}</p> : <div className={styles.tables}>
      {groups.map(phase => <GroupStandings withdrawn={championship.participantesDesistentes} key={phase.id} phase={phase} rounds={phase.rodadas.filter(round => round.status !== "PENDENTE")} roundNumber={Math.max(0, ...phase.rodadas.filter(round => round.status !== "PENDENTE").map(round => round.numero))} complete={stageComplete} qualifiedIds={qualifierIds.length ? qualifierIds : undefined} live />)}
      {!!league.length && <ChampionshipStandings withdrawn={championship.participantesDesistentes} rounds={rounds} participants={championship.participantes} official={championship.classificacaoAtual ?? undefined} final={championship.status === "FINALIZADO" && qualifiedCount == null} league={qualifiedCount == null} qualifiedCount={qualifiedCount} stageComplete={stageComplete && qualifiedCount != null} />}
    </div>}
    <p className={styles.note}>Atualização automática após resultados e alterações no campeonato. A conexão é restabelecida automaticamente em caso de interrupção.</p>
  </main>;
}
