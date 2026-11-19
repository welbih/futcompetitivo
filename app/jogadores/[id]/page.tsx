import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { validPlayerId } from "../../api/jogadores/upstream";
import PlayerStatistics from "./player-statistics";

export const metadata: Metadata = { title: "Estatísticas do jogador | Futebol Competitivo" };

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validPlayerId(id)) notFound();
  return <PlayerStatistics id={id} />;
}
