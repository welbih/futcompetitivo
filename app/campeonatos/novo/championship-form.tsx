"use client";

import Link from "next/link";
import type { OfficialClassification } from "../[id]/provisional-standings";
import type { SchedulePhase } from "../[id]/championship-schedule";
import OrganizationDialog from "./organization-dialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Organization = { id: number; nome: string; ativo: boolean };
type Player = { id: number; nome: string; apelido: string; ativo: boolean };
type Team = { id: number; nome: string; ativo: boolean };
type Entry = { jogadorId: number; equipeId: number };
export type Participant = { id: number; ativo: boolean; jogador: { id: number; nome: string; apelido: string; ativo: boolean }; equipe: { id: number; nome: string; logoUrl?: string | null; ativo: boolean } };
export type Championship = { classificacaoPorRodada?: OfficialClassification[]; fases?: SchedulePhase[]; status: string; id: number; edicao: number; organizacao: Organization; participantes: Participant[] };

export default function ChampionshipForm({ initial, onSaved, onCancel }: { initial?: Championship; onSaved?: (championship: Championship) => void; onCancel?: () => void }) {
  const [organizationId, setOrganizationId] = useState(initial ? String(initial.organizacao.id) : "");
  const [edition, setEdition] = useState(initial ? String(initial.edicao) : "");
  const editionIsValid = edition.trim() !== "" && Number.isInteger(Number(edition)) && Number(edition) > 0 && Number(edition) <= 2147483647;
  const [organizationDialogOpen, setOrganizationDialogOpen] = useState(false);
  const [organizationNotice, setOrganizationNotice] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [participantError, setParticipantError] = useState("");
  const [selected, setSelected] = useState<Entry[]>(initial?.participantes.map((participant) => ({ jogadorId: participant.jogador.id, equipeId: participant.equipe.id })) || []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const gameParam = useSearchParams().get("jogo");
  const game = gameParam === "PES" || gameParam === "FIFA" ? gameParam : "";
  const submitting = useRef(false);

  const availablePlayers = players.filter((player) => player.ativo && !selected.some((entry) => entry.jogadorId === player.id));

  function loadOptions() {
    return fetch("/api/campeonatos")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Não foi possível carregar os cadastros.");
        return data;
      })
      .then((data) => {
        setOrganizations(data.organizacoes.filter((item: Organization) => item.ativo));
        const activePlayers = data.jogadores as Player[];
        const activeTeams = data.equipes as Team[];
        setPlayers(activePlayers);
        setTeams(activeTeams);
      })
      .catch((cause: unknown) => setLoadError(cause instanceof Error ? cause.message : "Falha ao carregar os cadastros."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { void loadOptions(); }, []);

  return <><form className="creation-panel" aria-busy={loading || pending} onSubmit={async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    if (!organizationId || !editionIsValid) { setError("Selecione uma organização e informe uma edição inteira e positiva."); return; }
    if (selected.length < 4) { setError("Adicione pelo menos 4 participantes."); return; }
    const data = new FormData(event.currentTarget);
    submitting.current = true;
    setPending(true);
    try {
      const response = await fetch(initial ? `/api/campeonatos/${initial.id}` : "/api/campeonatos", { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizacaoId: Number(data.get("organizacaoId")), edicao: Number(data.get("edicao")), participantes: selected }) });
      const result = await response.json();
      if (!response.ok) throw new Error([result.detail, ...Object.values(result.erros || {})].filter(Boolean).join(" ") || "Não foi possível criar o campeonato.");
      if (onSaved) onSaved(result);
      else {
        setOrganizationId("");
        setEdition("");
        setSelected([]);
        setPlayerId("");
        setTeamId("");
        setParticipantError("");
        setOrganizationNotice("");
        setOrganizationDialogOpen(false);
        router.push(`/campeonatos/${result.id}`);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a criação. Verifique o serviço antes de tentar novamente."); }
    finally { submitting.current = false; setPending(false); }
  }}>
    <div className="form-panel-heading"><h2>{initial ? "Edite seu campeonato" : "Configure seu campeonato"}</h2>{game && <span className="game-context">{game}</span>}</div>
    <p>Organização, edição e participantes são obrigatórios. O campeonato será criado antes da definição do formato das partidas.</p>
    {game && <p className="form-note">Você veio da arena {game}. A API atual não registra o jogo no campeonato.</p>}
    {loading && <p role="status">Carregando organizações, jogadores e equipes…</p>}
    {loadError && <div role="alert" className="form-error"><p>{loadError}</p><button type="button" className="retry-button" onClick={() => { setLoading(true); setLoadError(""); void loadOptions(); }}>Tentar novamente</button></div>}
    <fieldset disabled={loading || !!loadError || pending} className="creation-fields">
      <div className="form-grid"><div><label htmlFor="organizacaoId">Organização</label><select id="organizacaoId" name="organizacaoId" required value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setOrganizationNotice(""); }}><option value="" disabled>Selecione uma organização</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select>
      <div className="empty-organization">{!loading && !loadError && !organizations.length && <p className="form-note">Nenhuma organização ativa. Crie uma para continuar.</p>}<button type="button" className="retry-button" onClick={() => setOrganizationDialogOpen(true)}>+ Criar organização</button></div></div>
      <div><label htmlFor="edicao">Edição</label><input id="edicao" name="edicao" type="number" min="1" max="2147483647" step="1" required value={edition} onChange={(event) => setEdition(event.target.value)} placeholder="Ex.: 2026" /></div></div>
      <fieldset className="participant-list"><legend>Participantes <span>{selected.length} adicionado(s) · mínimo 4</span></legend>
        <p>Selecione um jogador e a equipe que ele representará neste campeonato. Adicione pelo menos 4 participantes.</p>
        <div className="participant-selects">
          <div><label htmlFor="participant-player">Jogador</label><select id="participant-player" value={playerId} onChange={(event) => { setPlayerId(event.target.value); setParticipantError(""); }}><option value="">{players.length > 0 && !availablePlayers.length ? "Todos os jogadores adicionados" : "Selecione o jogador"}</option>{availablePlayers.map((item) => <option key={item.id} value={item.id}>{item.apelido ? `${item.apelido} — ${item.nome}` : item.nome}</option>)}</select></div>
          <div><label htmlFor="participant-team">Equipe</label><select id="participant-team" value={teamId} onChange={(event) => { setTeamId(event.target.value); setParticipantError(""); }}><option value="">Selecione a equipe</option>{teams.filter((item) => item.ativo).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div>
        </div>
        {!loading && !loadError && (!players.length || !teams.length) && <p className="form-note">Cadastre jogadores e equipes ativos na API para adicionar participantes.</p>}
        <button type="button" className="retry-button add-participant" disabled={!playerId || !teamId} onClick={() => {
          const entry = { jogadorId: Number(playerId), equipeId: Number(teamId) };
          if (selected.some((item) => item.jogadorId === entry.jogadorId)) { setParticipantError("Este jogador já foi adicionado ao campeonato."); return; }
          setSelected((previous) => previous.some((item) => item.jogadorId === entry.jogadorId) ? previous : [...previous, entry]);
          setPlayerId(""); setTeamId(""); setParticipantError(""); setError("");
        }}>+ Adicionar participante</button>
        {participantError && <p role="alert" className="form-error">{participantError}</p>}
        <div className="selected-participants" aria-live="polite">
          {!selected.length && <p className="form-note">Nenhum participante adicionado.</p>}
          {selected.map((entry) => {
            const player = players.find((item) => item.id === entry.jogadorId);
            const team = teams.find((item) => item.id === entry.equipeId);
            return <div key={`${entry.jogadorId}-${entry.equipeId}`} className="selected-participant"><span><strong>{player?.apelido || player?.nome}</strong><small>{team?.nome}</small></span><button type="button" className="remove-participant" aria-label={`Remover ${player?.apelido || player?.nome} com ${team?.nome}`} onClick={() => setSelected((previous) => previous.filter((item) => item.jogadorId !== entry.jogadorId || item.equipeId !== entry.equipeId))}><span aria-hidden="true">×</span></button></div>;
          })}
        </div>
      </fieldset>
    </fieldset>
    {organizationNotice && <p role="status" className="organization-notice">{organizationNotice}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="form-actions">{onCancel ? <button type="button" className="back-button" disabled={pending} onClick={onCancel}>Cancelar</button> : <Link href="/">Cancelar</Link>}<button type="submit" className="form-submit" disabled={loading || !!loadError || pending || !organizationId || !editionIsValid || !organizations.length || selected.length < 4}>{pending ? "Salvando…" : initial ? "Salvar alterações ↗" : "Criar campeonato ↗"}</button></div>
  </form>
    <OrganizationDialog open={organizationDialogOpen} onClose={() => setOrganizationDialogOpen(false)} onCreated={(organization) => {
      setOrganizations((previous) => [...previous.filter((item) => item.id !== organization.id), organization]);
      setOrganizationId(String(organization.id));
      setOrganizationNotice(`Organização ${organization.nome} cadastrada e selecionada.`);
      setOrganizationDialogOpen(false);
    }} />
  </>;
}














