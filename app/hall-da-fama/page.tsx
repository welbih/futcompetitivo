"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Championship } from "../campeonatos/novo/championship-form";
import { hallEditions, hallPlayerName, hallRanking } from "./hall-records";
import styles from "./hall.module.css";

export default function HallOfFamePage() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [organization, setOrganization] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/cadastros/campeonatos", { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error(data.detail || "Não foi possível carregar os campeonatos.");
        return data as Championship[];
      })
      .then(data => { if (!controller.signal.aborted) { setChampionships(data); setError(""); } })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o Hall da Fama."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const editions = hallEditions(championships);
  const ranking = hallRanking(editions);
  const organizations = [...new Map(editions.map(edition => [String(edition.championship.organizacao.id), edition.championship.organizacao])).values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const rows = hallRanking(organization ? editions.filter(edition => String(edition.championship.organizacao.id) === organization) : editions);
  const maxTitles = Math.max(0, ...ranking.map(row => row.titles));
  const maxRunnersUp = Math.max(0, ...ranking.map(row => row.runnersUp));
  const champions = ranking.filter(row => row.titles === maxTitles && maxTitles > 0);
  const runnersUp = ranking.filter(row => row.runnersUp === maxRunnersUp && maxRunnersUp > 0);
  const missing = championships.filter(championship => championship.status === "FINALIZADO").length - editions.length;

  return <main className={`resource-page ${styles.page}`}>
    <header className={styles.hero}>
      <div className={styles.ball} aria-hidden="true" />
      <p className="eyebrow">FUTEBOL COMPETITIVO / SUA ARENA</p>
      <span className={styles.kicker}>★ A HISTÓRIA DOS CAMPEÕES</span>
      <h1>Hall da <span>Fama</span></h1>
      <p>Os nomes que marcaram cada edição. As conquistas que fazem a nossa história.</p>
    </header>
    {loading && <p role="status" className="form-note">Carregando a história dos campeonatos…</p>}
    {error && <div role="alert" className="form-error"><p>{error}</p><button className="retry-button" onClick={() => { setLoading(true); setError(""); setRetry(value => value + 1); }}>Tentar novamente</button></div>}
    {!loading && !error && <>
      {missing > 0 && <p className="form-note">{missing} campeonato(s) finalizado(s) ainda sem resultado suficiente para identificar o campeão.</p>}
      {!editions.length ? <div className={styles.empty}><h2>A história está começando</h2><p>Os campeões aparecerão aqui quando os campeonatos forem finalizados e seus resultados estiverem disponíveis.</p><Link href="/campeonatos" className="retry-button">Ver campeonatos ↗</Link></div> : <>
        <section className={styles.section} aria-labelledby="hall-highlights"><h2 id="hall-highlights">Destaques</h2>
          <div className={styles.highlights}>
            <article className={styles.highlight}><span className={styles.category}>MAIOR CAMPEÃO{champions.length > 1 ? " · EMPATE" : ""}</span><strong>{champions.map(row => hallPlayerName(row.player)).join(" · ")}</strong><p>{maxTitles} {maxTitles === 1 ? "título" : "títulos"}{champions.length > 1 ? " para cada jogador" : " conquistados"}</p><span className={styles.watermark} aria-hidden="true">★</span></article>
            <article className={`${styles.highlight} ${styles.silver}`}><span className={styles.category}>MAIOR VICE{runnersUp.length > 1 ? " · EMPATE" : ""}</span><strong>{runnersUp.length ? runnersUp.map(row => hallPlayerName(row.player)).join(" · ") : "A definir"}</strong><p>{maxRunnersUp} vice-campeonatos{runnersUp.length > 1 ? " para cada jogador" : ""}</p><span className={styles.watermark} aria-hidden="true">Ⅱ</span></article>
            <article className={styles.highlight}><span className={styles.category}>CAMPEÕES DO TORNEIO</span><strong>{ranking.filter(row => row.titles > 0).length} campeões diferentes</strong><p>Conquistas distribuídas em {editions.length} edições.</p><div className={styles.tags}>{ranking.filter(row => row.titles > 0).map(row => <span key={row.player.id}>{hallPlayerName(row.player)}</span>)}</div></article>
          </div>
        </section>
        <section className={styles.section} aria-labelledby="hall-rankings"><h2 id="hall-rankings">Rankings</h2>
          <div className={styles.tabs} role="group" aria-label="Organização do ranking"><button aria-pressed={!organization} onClick={() => setOrganization("")}>Ranking geral</button>{organizations.map(org => <button key={org.id} aria-pressed={organization === String(org.id)} onClick={() => setOrganization(String(org.id))}>{org.nome}</button>)}</div>
          <ol className={styles.ranking} aria-label="Ranking de campeões">{rows.map(row => <li key={row.player.id} className={styles.rankCard} data-position={row.position}>
            <span className={styles.position} aria-label={`${row.position}º lugar`}>{row.position}</span>
            <div className={styles.rankIdentity}><strong>{hallPlayerName(row.player)}</strong><span>{row.finals} {row.finals === 1 ? "final disputada" : "finais disputadas"}</span></div>
            <div className={styles.rankStats}><div><b>{row.titles}</b><small>Títulos</small></div><div><b>{row.runnersUp}</b><small>Vices</small></div></div>
          </li>)}</ol>
          <p className={styles.note}>Ordenado por títulos e depois por vices. Jogadores com a mesma quantidade de títulos e vices dividem a posição. Top 2 soma títulos e vice-campeonatos, incluindo ligas. Apenas campeonatos finalizados com campeão identificado são contabilizados.</p>
        </section>

        <section className={styles.section} aria-labelledby="hall-finals"><h2 id="hall-finals">As finais</h2><p className={styles.note}>Campeões e vices por edição. Nas ligas, as colocações seguem a classificação oficial.</p>
          {organizations.map(org => <section key={org.id} className={styles.organization} aria-labelledby={`hall-org-${org.id}`}><h3 id={`hall-org-${org.id}`}><span />{org.nome}</h3><div className={styles.editions}>
            {editions.filter(edition => edition.championship.organizacao.id === org.id).map(edition => <article key={edition.championship.id} className={styles.edition}>
              <header><Link href={`/campeonatos/${edition.championship.id}`}>{edition.championship.edicao}ª Edição <span aria-hidden="true">↗</span></Link><span className={styles.badge}>FINALIZADO</span></header>
              <div className={styles.place}><b>1</b><div><small>CAMPEÃO</small><strong>{hallPlayerName(edition.champion.jogador)}</strong><span>{edition.champion.equipe.nome}</span></div></div>
              <div className={`${styles.place} ${styles.second}`}><b>2</b><div><small>VICE-CAMPEÃO</small><strong>{edition.runnerUp ? hallPlayerName(edition.runnerUp.jogador) : "Não informado"}</strong>{edition.runnerUp && <span>{edition.runnerUp.equipe.nome}</span>}</div></div>
            </article>)}
          </div></section>)}
        </section>
        <section className={styles.section} aria-labelledby="hall-numbers"><h2 id="hall-numbers">Em Números</h2>
          <dl className={styles.counters}>
            <div><dt>Edições</dt><dd>{editions.length}</dd></div>
            {organizations.map(org => <div key={org.id}><dt>Campeonatos · {org.nome}</dt><dd>{editions.filter(edition => edition.championship.organizacao.id === org.id).length}</dd></div>)}
            <div><dt>Finalistas</dt><dd>{ranking.length}</dd></div>
          </dl>
          <p className={styles.note}>Finalistas são os jogadores que terminaram ao menos uma edição como campeão ou vice, incluindo ligas.</p>
        </section>

      </>}
    </>}
  </main>;
}
