"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdminPermission } from "./use-admin-permission";
import ChampionshipDeleteMenu from "./championship-delete-menu";
import type { Championship, Participant } from "../campeonatos/novo/championship-form";
import { championshipChampion } from "./championship-champion";

type Entry = { id: number; nome?: string; apelido?: string; ativo?: boolean; organizacao?: { id: number; nome: string }; edicao?: number; status?: string; participantes?: Participant[]; fases?: Championship["fases"]; classificacaoPorRodada?: Championship["classificacaoPorRodada"] };

export default function ResourceList({ resource, title, description }: { resource: string; title: string; description: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [organization, setOrganization] = useState("");
  const [champion, setChampion] = useState("");
  const isAdmin = useAdminPermission(resource === "campeonatos");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/cadastros/${resource}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Não foi possível carregar a listagem.");
        if (!Array.isArray(data)) throw new Error("A API retornou uma listagem inválida.");
        return data as Entry[];
      })
      .then(setEntries)
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Erro ao carregar a listagem."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [resource]);

  const championships = entries.map(entry => ({ entry, champion: championshipChampion({ ...entry, status: entry.status || "" }) }));
  const organizations = [...new Map(entries.filter(entry => entry.organizacao).map(entry => [String(entry.organizacao!.id), entry.organizacao!])).values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const champions = [...new Map(championships.filter(item => item.champion).map(item => [String(item.champion!.jogador.id), item.champion!.jogador])).values()].sort((a, b) => (a.apelido || a.nome).localeCompare(b.apelido || b.nome, "pt-BR"));
  const visible = resource === "campeonatos" ? championships.filter(item => (!organization || String(item.entry.organizacao?.id) === organization) && (!champion || String(item.champion?.jogador.id) === champion)).map(item => item.entry).sort((a, b) => (b.edicao || 0) - (a.edicao || 0) || b.id - a.id) : entries;

  return <main className="resource-page"><p className="eyebrow">FUTEBOL COMPETITIVO / SUA ARENA</p><div className="resource-heading"><div><h1>{title}</h1><p>{description}</p></div>{resource === "campeonatos" && <Link href="/campeonatos/novo" className="header-cta">Criar campeonato ↗</Link>}</div>
    {resource === "campeonatos" && <div className="championship-filters">
      <label htmlFor="championship-organization">Organização<select id="championship-organization" value={organization} onChange={event => setOrganization(event.target.value)}><option value="">Todas as organizações</option>{organizations.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
      <label htmlFor="championship-champion">Campeão<select id="championship-champion" value={champion} onChange={event => setChampion(event.target.value)}><option value="">Todos os campeões</option>{champions.map(item => <option key={item.id} value={item.id}>{item.apelido || item.nome}</option>)}</select></label>
      <button type="button" className="retry-button" disabled={!organization && !champion} onClick={() => { setOrganization(""); setChampion(""); }}>Limpar filtros</button>
    </div>}
    {loading && <p role="status" className="form-note">Carregando…</p>}
    {error && <div role="alert" className="form-error"><p>{error}</p><button type="button" className="retry-button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
    {!loading && !error && !visible.length && <p className="resource-empty">{entries.length ? "Nenhum campeonato encontrado com os filtros selecionados." : "Nenhum registro encontrado."}</p>}
    <div className="resource-grid">{visible.map((item) => <article key={item.id} className={`resource-card${resource === "campeonatos" ? " championship-card" : ""}`}>{resource === "campeonatos" && <Link href={`/campeonatos/${item.id}`} className="championship-card-link" aria-label={`Ver campeonato ${item.organizacao?.nome}, edição ${item.edicao}`} />}{resource === "campeonatos" && isAdmin && <ChampionshipDeleteMenu
      id={item.id} name={`${item.organizacao?.nome || "Campeonato"}, edição ${item.edicao}`}
      onDeleted={() => setEntries(current => current.filter(entry => entry.id !== item.id))}
    />}{resource !== "campeonatos" && <span className="eyebrow">#{item.id}</span>}<h2>{item.organizacao?.nome || item.apelido || item.nome}</h2>{resource === "jogadores" && item.apelido && <p>{item.nome}</p>}{resource === "campeonatos" ? <><p>Edição {item.edicao} · {item.participantes?.length || 0} participantes</p><span className="resource-status championship-status" data-status={item.status}>{item.status === "CRIADO" ? "Criado" : item.status === "EM_ANDAMENTO" ? "Em andamento" : item.status === "FINALIZADO" ? "Finalizado" : item.status}</span></> : <span className="resource-status">{item.ativo ? "Ativo" : "Inativo"}</span>}</article>)}</div>
  </main>;
}


