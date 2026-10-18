"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Entry = { id: number; nome?: string; apelido?: string; ativo?: boolean; organizacao?: { nome: string }; edicao?: number; status?: string; participantes?: unknown[] };

export default function ResourceList({ resource, title, description }: { resource: string; title: string; description: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return <main className="resource-page"><p className="eyebrow">FUTEBOL COMPETITIVO / SUA ARENA</p><div className="resource-heading"><div><h1>{title}</h1><p>{description}</p></div>{resource === "campeonatos" && <Link href="/campeonatos/novo" className="header-cta">Criar campeonato ↗</Link>}</div>
    {loading && <p role="status" className="form-note">Carregando…</p>}
    {error && <div role="alert" className="form-error"><p>{error}</p><button type="button" className="retry-button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
    {!loading && !error && !entries.length && <p className="resource-empty">Nenhum registro encontrado.</p>}
    <div className="resource-grid">{entries.map((item) => <article key={item.id} className={`resource-card${resource === "campeonatos" ? " championship-card" : ""}`}>{resource === "campeonatos" && <Link href={`/campeonatos/${item.id}`} className="championship-card-link" aria-label={`Ver campeonato ${item.organizacao?.nome}, edição ${item.edicao}`} />}<span className="eyebrow">#{item.id}</span><h2>{item.organizacao?.nome || item.apelido || item.nome}</h2>{resource === "jogadores" && item.apelido && <p>{item.nome}</p>}{resource === "campeonatos" ? <><p>Edição {item.edicao} · {item.participantes?.length || 0} participantes</p><span className="resource-status championship-status" data-status={item.status}>{item.status === "CRIADO" ? "Criado" : item.status === "EM_ANDAMENTO" ? "Em andamento" : item.status === "FINALIZADO" ? "Finalizado" : item.status}</span></> : <span className="resource-status">{item.ativo ? "Ativo" : "Inativo"}</span>}</article>)}</div>
  </main>;
}


