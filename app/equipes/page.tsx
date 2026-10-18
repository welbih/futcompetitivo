import type { Metadata } from "next";
import TeamsManager from "./teams-manager";

export const metadata: Metadata = { title: "Equipes | Futebol Competitivo" };

export default function TeamsPage() { return <TeamsManager />; }
