import { jsonBody, validId, x1Request } from "./upstream";
export async function GET() { return x1Request(); }
export async function POST(request: Request) {
  const data = await jsonBody(request);
  const validParticipant = (value: unknown): value is { jogadorId: number; equipeId: number } => value !== null && typeof value === "object" && "jogadorId" in value && "equipeId" in value && validId(value.jogadorId) && validId(value.equipeId);
  if (!data || !validParticipant(data.participanteUm) || !validParticipant(data.participanteDois) || data.participanteUm.jogadorId === data.participanteDois.jogadorId || !["MELHOR_DE_TRES", "MELHOR_DE_CINCO"].includes(data.tipo) || (data.encerrarAntecipadamente != null && typeof data.encerrarAntecipadamente !== "boolean")) return Response.json({ detail: "Selecione dois jogadores diferentes, uma equipe para cada participante e um formato válido." }, { status: 400 });
  const participant = (value: { jogadorId: number; equipeId: number }) => ({ jogadorId: value.jogadorId, equipeId: value.equipeId });
  return x1Request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participanteUm: participant(data.participanteUm), participanteDois: participant(data.participanteDois), tipo: data.tipo, encerrarAntecipadamente: data.encerrarAntecipadamente ?? false }) });
}
