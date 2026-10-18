import type { Metadata } from "next";
import PlayersManager from "./players-manager";

export const metadata: Metadata = { title: "Jogadores | Futebol Competitivo" };

export default function PlayersPage() { return <PlayersManager />; }
