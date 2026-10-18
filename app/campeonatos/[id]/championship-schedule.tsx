"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import EncounterMatrix from "./encounter-matrix";
import ChampionshipStandings from "./championship-standings";
import ChampionshipScorers from "./championship-scorers";
import type { OfficialClassification } from "./provisional-standings";
import { playerRecords, type PlayerRecord } from "./player-record";
import MatchResultDialog from "./match-result-dialog";
import type { Championship } from "../novo/championship-form";
import type { Participant } from "../novo/championship-form";

export type SchedulePhase = {
  id: number;
  ordem: number;
  tipo: string;
  rodadas: {
    id: number;
    numero: number;
    status: string;
    folgaParticipanteId: number | null;
    partidas: {
      id: number;
      mandante: Participant;
      visitante: Participant;
      status: string;
      resultado: { golsMandante: number; golsVisitante: number } | null;
    }[];
  }[];
};

const roundStatus: Record<string, string> = { PENDENTE: "Pendente", EM_ANDAMENTO: "Em andamento", FINALIZADA: "Finalizada" };
const matchStatus: Record<string, string> = { AGENDADA: "Agendada", EM_ANDAMENTO: "Em andamento", FINALIZADA: "Finalizada" };

function TeamLogo({ team }: { team: Participant["equipe"] }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = team.logoUrl?.trim();
  const usable = !!url && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url));
  return <span className="team-logo" title={team.nome}>
    {usable && failedUrl !== url ? <Image src={url} alt={`Logo de ${team.nome}`} width={44} height={44} unoptimized onError={() => setFailedUrl(url)} /> : <span className="team-logo-fallback" role="img" aria-label={`Equipe ${team.nome}, sem logo disponível`}>{team.nome.trim().slice(0, 2).toUpperCase()}</span>}
  </span>;
}

function Opponent({ participant, away = false, v2 = false, v3 = false }: { participant: Participant; away?: boolean; v2?: boolean; v3?: boolean }) {
  const name = participant.jogador.apelido?.trim() || participant.jogador.nome;
  if (v3) return <div className={`match-opponent opponent-v3${away ? " away-opponent" : ""}`}><TeamLogo team={participant.equipe} /><strong>{name}</strong></div>;
  if (v2) return <div className={`match-opponent opponent-v2${away ? " away-opponent" : ""}`}><TeamLogo team={participant.equipe} /><strong>{name}</strong></div>;
  return <div className={`match-opponent${away ? " away-opponent" : ""}`}><strong>{name}</strong><span>{participant.equipe.nome}</span></div>;
}
function PlayerStats({ participant, record }: { participant: Participant; record?: PlayerRecord }) {
  return <span className="player-result-stats" aria-label={`Estatísticas de ${participant.jogador.apelido || participant.jogador.nome} até esta rodada`}><span><b>{record?.wins || 0}</b> vitórias</span><span><b>{record?.losses || 0}</b> derrotas</span><span><b>{record?.draws || 0}</b> empates</span></span>;
}
function completedActiveRound(phases: SchedulePhase[]) {
  const active = [...phases].sort((a, b) => a.ordem - b.ordem).flatMap((phase) => [...phase.rodadas].sort((a, b) => a.numero - b.numero)).find((round) => round.status === "EM_ANDAMENTO");
  return active && active.partidas.length > 0 && active.partidas.every((match) => match.status === "FINALIZADA") ? active.id : null;
}
export default function ChampionshipSchedule({ phases, participants, championshipId, editable, onUpdated, classifications }: { phases: SchedulePhase[]; participants: Participant[]; championshipId: number; classifications?: OfficialClassification[]; editable: boolean; onUpdated: (championship: Championship) => void }) {
  const [selectedMatch, setSelectedMatch] = useState<SchedulePhase["rodadas"][number]["partidas"][number] | null>(null);
  const [view, setView] = useState<"all" | "single" | "single-v2" | "single-v3">("single-v3");
  const [resultsRoundId, setResultsRoundId] = useState<number | null>(() => completedActiveRound(phases));
  const [scorersRoundId, setScorersRoundId] = useState<number | null>(null);
  const [standingsRoundId, setStandingsRoundId] = useState<number | null>(() => !editable ? [...phases].sort((a, b) => a.ordem - b.ordem).flatMap((phase) => [...phase.rodadas].sort((a, b) => a.numero - b.numero)).at(-1)?.id ?? null : null);
  const [matrixRoundId, setMatrixRoundId] = useState<number | null>(null);
  const [heldRoundId, setHeldRoundId] = useState<number | null>(null);
  const [openingNextRound, setOpeningNextRound] = useState(false);
  const [nextRoundError, setNextRoundError] = useState("");
  const nextRoundLock = useRef(false);
  const [roundIndex, setRoundIndex] = useState<number | null>(null);
  const ordered = [...phases].sort((a, b) => a.ordem - b.ordem);
  const rounds = ordered.flatMap((phase) => [...phase.rodadas].sort((a, b) => a.numero - b.numero).map((round) => ({ phase, round })));
  const totalRounds = rounds.length;
  const activeIndex = rounds.findIndex(({ round }) => round.status === "EM_ANDAMENTO");
  const pendingIndex = rounds.findIndex(({ round }) => round.status === "PENDENTE");
  const defaultIndex = activeIndex >= 0 ? activeIndex : pendingIndex >= 0 ? pendingIndex : Math.max(0, totalRounds - 1);
  const heldIndex = rounds.findIndex(({ round }) => round.id === heldRoundId);
  const currentIndex = Math.min(view === "single-v3" ? (heldIndex >= 0 ? heldIndex : defaultIndex) : roundIndex ?? defaultIndex, Math.max(0, totalRounds - 1));
  const current = rounds[currentIndex];
  const nextRound = rounds[currentIndex + 1];
  const roundFinished = !!current && current.round.partidas.length > 0 && current.round.partidas.every((match) => match.status === "FINALIZADA");
  const showStandings = view === "single-v3" && !!current && standingsRoundId === current.round.id;
  const showScorers = view === "single-v3" && !!current && scorersRoundId === current.round.id && !showStandings;
  const showMatrix = view === "single-v3" && !!current && matrixRoundId === current.round.id && !showStandings && !showScorers;
  const showResults = view === "single-v3" && !!current && resultsRoundId === current.round.id && !showMatrix && !showStandings && !showScorers;
  const canAdvance = roundFinished;
  const records = playerRecords(rounds.slice(0, currentIndex + 1).map((entry) => entry.round), participants);
  const totalGames = rounds.reduce((total, entry) => total + entry.round.partidas.length, 0);
  const completedGames = rounds.slice(0, currentIndex + 1).reduce((total, entry) => total + entry.round.partidas.filter((match) => match.status === "FINALIZADA").length, 0);
  const gamesBefore = rounds.slice(0, currentIndex).reduce((total, entry) => total + entry.round.partidas.length, 0);
  const currentGames = current?.round.partidas.length || 0;
  const remainingGames = current?.round.partidas.filter((match) => match.status !== "FINALIZADA").length || 0;
  const visiblePhases = view === "all" ? ordered : current ? [{ ...current.phase, rodadas: [current.round] }] : [];

  async function openStandings() {
    if (!current || nextRoundLock.current) return;
    setStandingsRoundId(current.round.id);
    setNextRoundError("");
    if (nextRound || !editable || current.round.status === "FINALIZADA" || !roundFinished) return;
    nextRoundLock.current = true; setOpeningNextRound(true);
    try {
      const response = await fetch(`/api/campeonatos/${championshipId}/rodadas/${current.round.id}/finalizar`, { method: "POST" });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.detail || "Não foi possível finalizar a última rodada.");
      setHeldRoundId(current.round.id); onUpdated(updated);
    } catch (cause) { setNextRoundError(cause instanceof Error ? cause.message : "Não foi possível confirmar a finalização. Atualize a agenda antes de tentar novamente."); }
    finally { nextRoundLock.current = false; setOpeningNextRound(false); }
  }
  return <section className="schedule" aria-labelledby="schedule-title">
    <div className="schedule-heading"><div><p className="eyebrow">DENTRO DE CAMPO</p><h2 id="schedule-title">Agenda do campeonato</h2></div><span>{totalRounds} rodada(s)</span></div>
    <div className="schedule-controls">
      <div className="schedule-view-options" role="group" aria-label="Visualização da agenda">
        <button type="button" aria-pressed={view === "all"} onClick={() => setView("all")}>Todas as rodadas</button>
        <button type="button" aria-pressed={view === "single"} disabled>Por rodada</button>
        <button type="button" aria-pressed={view === "single-v2"} disabled>Por rodada v2</button>
        <button type="button" aria-pressed={view === "single-v3"} onClick={() => { setView("single-v3"); setHeldRoundId(null); setResultsRoundId(completedActiveRound(phases)); setMatrixRoundId(null); setStandingsRoundId(!editable ? rounds.at(-1)?.round.id ?? null : null); setScorersRoundId(null); }}>Por rodada v3</button>
      </div>

    </div>
    {view !== "all" && editable && !showResults && !showMatrix && !showStandings && !showScorers && <p className="form-note">Clique em uma partida da rodada em andamento para informar o placar.</p>}
    {!totalRounds && <p className="resource-empty">Nenhuma rodada foi gerada para este campeonato.</p>}
    {visiblePhases.map((phase) => <section key={phase.id} className="schedule-phase" aria-label={`Fase ${phase.ordem}`}>
      <div className="phase-heading"><span>FASE {phase.ordem.toString().padStart(2, "0")}</span><span>{phase.tipo === "LIGA" ? "Liga" : phase.tipo === "SWISS" ? "Suíço" : phase.tipo}</span></div>
      {phase.tipo === "SWISS" && <p className="form-note">No formato suíço, as próximas rodadas são geradas conforme o campeonato avança.</p>}
      {view !== "all" && view !== "single-v3" && totalRounds > 0 && <div className="round-navigation" role="group" aria-label="Navegação entre rodadas">
        <button type="button" aria-label="Rodada anterior" disabled={currentIndex === 0} onClick={() => setRoundIndex(Math.max(0, currentIndex - 1))}><span aria-hidden="true">←</span></button>
        <span aria-live="polite" aria-atomic="true">{ordered.length > 1 && `Fase ${current.phase.ordem} · `}Rodada {current.round.numero}<small>{currentIndex + 1} de {totalRounds}</small></span>
        <button type="button" aria-label="Próxima rodada" disabled={currentIndex === totalRounds - 1} onClick={() => setRoundIndex(Math.min(totalRounds - 1, currentIndex + 1))}><span aria-hidden="true">→</span></button>
      </div>}
      {view === "single-v3" && current && <div className="current-round-summary" role="status" aria-live="polite" aria-atomic="true">
        <div className="round-stats-panel"><span className="round-stat-total"><span className="round-stat-label">CAMPEONATO</span><span>Total de <b>{totalGames}</b> {phase.tipo === "SWISS" ? "jogos gerados" : "jogos"}</span></span><span className="round-stat-current"><span className="round-stat-label">RODADA ATUAL</span><span>{showResults || showMatrix || showScorers || showStandings ? <><b>{completedGames}º</b> jogo finalizado</> : currentGames > 0 ? <><b>{gamesBefore + 1}º{currentGames > 1 ? ` ao ${gamesBefore + currentGames}º` : ""}</b> {currentGames > 1 ? "jogos" : "jogo"} nesta rodada</> : "Nenhum jogo nesta rodada"}</span></span></div>
        <small>{currentGames} jogo(s) nesta rodada · {remainingGames} a disputar</small>
        <strong>Rodada {current.round.numero}</strong>
        <span className="upcoming-games-title">{showStandings ? "Tabela de classificação" : showScorers ? "Artilheiros do campeonato" : showMatrix ? "Matriz de enfrentamentos" : showResults ? "Resultados da rodada" : "Próximos jogos"}</span>
      </div>}
      {view === "single-v3" && current && <div className={`advance-round-controls${showMatrix || showStandings || showScorers ? " summary-screen-controls" : ""}`}>
        {showStandings ? <>
          <button type="button" className="retry-button summary-back-button" disabled={openingNextRound} onClick={() => { setHeldRoundId(current.round.id); setStandingsRoundId(null); setScorersRoundId(current.round.id); }}>Voltar aos artilheiros</button>
          {nextRound && <button type="button" className="retry-button advance-round-button" disabled={openingNextRound || !roundFinished} onClick={async () => {
            if (nextRoundLock.current || !roundFinished) return;
            nextRoundLock.current = true; setOpeningNextRound(true); setNextRoundError("");
            try {
              if (current.round.status !== "FINALIZADA") {
                const response = await fetch(`/api/campeonatos/${championshipId}/rodadas/${current.round.id}/finalizar`, { method: "POST" });
                const updated = await response.json();
                if (!response.ok) throw new Error(updated.detail || "Não foi possível encerrar a rodada atual.");
                onUpdated(updated);
              }
              setHeldRoundId(nextRound.round.id); setRoundIndex(currentIndex + 1);
              setResultsRoundId(null); setMatrixRoundId(null); setScorersRoundId(null); setStandingsRoundId(null);
            } catch (cause) { setNextRoundError(cause instanceof Error ? cause.message : "Não foi possível confirmar o avanço. Atualize a agenda antes de tentar novamente."); }
            finally { nextRoundLock.current = false; setOpeningNextRound(false); }
          }}>{openingNextRound ? "Avançando…" : "Próxima rodada →"}</button>}
          {openingNextRound && !nextRound && <p role="status" className="form-note">Finalizando a última rodada…</p>}{nextRoundError && <div role="alert" className="form-error"><p>{nextRoundError}</p>{!nextRound && <button type="button" className="retry-button" disabled={openingNextRound} onClick={openStandings}>Tentar novamente</button>}</div>}
        </> : showScorers ? <>
          <button type="button" className="retry-button summary-back-button" onClick={() => { setScorersRoundId(null); setMatrixRoundId(current.round.id); }}>Voltar à matriz</button>
          <button type="button" className="retry-button advance-round-button" onClick={openStandings}>Avançar →</button>
        </> : showMatrix ? <>
          <button type="button" className="retry-button summary-back-button" onClick={() => { setMatrixRoundId(null); setResultsRoundId(current.round.id); }}>Voltar aos resultados</button>
          <button type="button" className="retry-button advance-round-button" onClick={() => setScorersRoundId(current.round.id)}>Avançar →</button>
        </> : <button type="button" className="retry-button advance-round-button" disabled={!canAdvance} onClick={() => {
          if (!canAdvance) return;
          setHeldRoundId(current.round.id);
          if (!showResults) setResultsRoundId(current.round.id);
          else setMatrixRoundId(current.round.id);
        }}>Avançar →</button>}
        {!roundFinished && <small>Finalize todas as partidas desta rodada para avançar.</small>}
      </div>}
      {showResults && <p className="result-stats-note">Estatísticas acumuladas no campeonato até esta rodada.</p>}
      {showStandings ? <div className="single-round-grid"><ChampionshipStandings official={classifications?.find((entry) => entry.rodada === current.round.numero)} final={!editable} league={current.phase.tipo === "LIGA"} rounds={rounds.slice(0, currentIndex + 1).map((entry) => entry.round)} participants={participants} /></div> : showScorers ? <div className="single-round-grid"><ChampionshipScorers final={!editable && rounds.length > 0 && currentIndex === rounds.length - 1 && rounds.every((entry) => entry.round.status === "FINALIZADA")} rounds={rounds.slice(0, currentIndex + 1).map((entry) => entry.round)} participants={participants} /></div> : showMatrix ? <div className="single-round-grid"><EncounterMatrix rounds={rounds.slice(0, currentIndex + 1).map((entry) => entry.round)} participants={participants} /></div> : <div className={`rounds-grid${view !== "all" ? " single-round-grid" : ""}`}>{[...phase.rodadas].sort((a, b) => a.numero - b.numero).map((round) => {
        const bye = participants.find((participant) => participant.id === round.folgaParticipanteId);
        return <article key={round.id} className="round-card"><header className="round-heading"><h3><span>RODADA</span> {String(round.numero).padStart(2, "0")}</h3><span className="round-status" data-status={round.status}>{roundStatus[round.status] || round.status}</span></header>
          <div className="round-matches">{round.partidas.map((match) => <button type="button" key={match.id} className={`schedule-match match-result-button${showResults ? " match-results-view" : ""}`} disabled={view === "all"} aria-disabled={view === "all" || !editable || round.status !== "EM_ANDAMENTO"} aria-describedby={view === "single-v3" && !showResults && match.resultado ? `match-result-${match.id}` : undefined} aria-label={`${match.resultado ? "Editar" : "Adicionar"} placar: ${match.mandante.jogador.apelido || match.mandante.jogador.nome} contra ${match.visitante.jogador.apelido || match.visitante.jogador.nome}`} onClick={() => { if (view !== "all" && editable && round.status === "EM_ANDAMENTO") setSelectedMatch(match); }}><div className="match-meta"><span>PARTIDA #{match.id}</span></div><span className="match-status-badge" data-status={match.status}>{matchStatus[match.status] || match.status}</span><div className="match-teams"><Opponent participant={match.mandante} v3={showResults} v2={view === "single-v2" || view === "single-v3"} /><div className={`match-score${match.resultado && (view !== "single-v3" || showResults) ? " has-result" : ""}`} aria-label={match.resultado && (view !== "single-v3" || showResults) ? `Placar: ${match.resultado.golsMandante} a ${match.resultado.golsVisitante}` : view === "single-v3" ? "Versus" : "Partida sem resultado"}>{match.resultado && (view !== "single-v3" || showResults) ? <><b>{match.resultado.golsMandante}</b><span>:</span><b>{match.resultado.golsVisitante}</b></> : <span>VS</span>}</div><Opponent participant={match.visitante} away v3={showResults} v2={view === "single-v2" || view === "single-v3"} /></div>{view === "single-v3" && !showResults && match.resultado && <span id={`match-result-${match.id}`} role="tooltip" className="match-result-tooltip">Resultado: <strong>{match.resultado.golsMandante} × {match.resultado.golsVisitante}</strong></span>}{showResults && <span className="match-result-stats-footer"><PlayerStats participant={match.mandante} record={records.get(match.mandante.jogador.id)} /><PlayerStats participant={match.visitante} record={records.get(match.visitante.jogador.id)} /></span>}</button>)}</div>
          {!round.partidas.length && <p className="form-note round-empty">Nenhuma partida nesta rodada.</p>}
          {round.folgaParticipanteId != null && <p className="round-bye"><span>FOLGA</span> {bye ? `${bye.jogador.apelido || bye.jogador.nome} · ${bye.equipe.nome}` : `Participante #${round.folgaParticipanteId}`}</p>}
        </article>;
      })}</div>}
    </section>)}
    {selectedMatch && <MatchResultDialog key={selectedMatch.id} championshipId={championshipId} match={selectedMatch} saveWithoutFinalizingRound={view === "single-v3" ? { roundId: rounds.find((entry) => entry.round.partidas.some((match) => match.id === selectedMatch.id))!.round.id } : undefined} onClose={() => setSelectedMatch(null)} onSaved={(updated) => {
      if (view === "single-v3" && selectedMatch) {
        const updatedRound = updated.fases?.flatMap((phase) => phase.rodadas).find((round) => round.partidas.some((match) => match.id === selectedMatch.id));
        if (updatedRound?.status === "FINALIZADA") setHeldRoundId(updatedRound.id);
        setResultsRoundId(null);
        setMatrixRoundId(null);
        setStandingsRoundId(null);
        setScorersRoundId(null);
      }
      onUpdated(updated);
    }} />}
  </section>;
}






























