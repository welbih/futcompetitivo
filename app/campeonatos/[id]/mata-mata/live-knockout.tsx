"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useChampionshipLive } from "../use-championship-live";
import KnockoutBracket from "../knockout-bracket";
import styles from "../classificacao/standings.module.css";

export default function LiveKnockout() {
  const { id } = useParams<{ id: string }>();
  const { championship, status, error, removed } = useChampionshipLive(id);
  const back = <Link className={styles.back} href={`/campeonatos/${id}`}>← Voltar ao campeonato</Link>;
  if (removed) return <main className={styles.page}><h1>Campeonato removido</h1><p>A transmissão foi encerrada.</p><Link className={styles.back} href="/campeonatos">← Campeonatos</Link></main>;
  if (!championship) return <main className={styles.page}>{back}<p role={error ? "alert" : "status"}>{error || "Carregando mata-mata ao vivo…"}</p>{error && <p>Uma nova tentativa será feita automaticamente.</p>}</main>;
  const available = championship.fases?.some(phase => phase.tipo === "ELIMINATORIA");
  return <main className={styles.page}>
    <header className={styles.header}><div>{back}<p className="eyebrow">MATA-MATA AO VIVO</p><h1>Campeonato {championship.organizacao.nome}</h1><p>{championship.edicao}ª edição · {championship.participantes.length} participantes{championship.status === "FINALIZADO" ? " · Finalizado" : ""}</p></div><p role="status" className={styles.connection} data-live={status === "live"}>{status === "live" ? "● Conectado ao vivo" : status === "sync-error" ? "Sincronização pendente — tentando novamente…" : status === "reconnecting" ? "Reconectando…" : "Conectando…"}</p></header>
    {error && <p role="alert" className="form-error">{error} Os dados exibidos são os últimos recebidos.</p>}
    {available ? <KnockoutBracket championship={championship} onUpdated={() => {}} embedded readOnly /> : <p className={styles.empty}>{championship.aguardandoMataMata ? "A fase classificatória terminou. Aguardando o admin iniciar o mata-mata." : championship.status === "CRIADO" ? "O chaveamento ficará disponível após o início da fase eliminatória." : "O campeonato ainda não possui uma fase eliminatória. Se houver mata-mata, ele aparecerá aqui automaticamente quando for criado."}</p>}
    <p className={styles.note}>Placares e avanços atualizam automaticamente. Use o zoom e a rolagem horizontal para acompanhar o chaveamento completo.</p>
  </main>;
}
