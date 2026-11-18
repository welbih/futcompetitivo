import { championshipRequest, type ChampionshipContext } from "../upstream";
import { cookies } from "next/headers";
import { sameOrigin, sessionCookie, sessionUser } from "../../auth/session";

export async function DELETE(request: Request, { params }: ChampionshipContext) {
  if (!sameOrigin(request)) return Response.json({ detail: "Origem inválida." }, { status: 403 });
  const token = (await cookies()).get(sessionCookie)?.value;
  const user = token ? sessionUser(token) : null;
  if (!user) return Response.json({ detail: "Entre na sua conta para continuar." }, { status: 401 });
  if (!user.isAdmin) return Response.json({ detail: "Somente administradores podem apagar campeonatos." }, { status: 403 });
  return championshipRequest((await params).id, { method: "DELETE" });
}

export async function GET(_request: Request, { params }: ChampionshipContext) {
  return championshipRequest((await params).id);
}

export async function PUT(request: Request, { params }: ChampionshipContext) {
  let data;
  try { data = await request.json(); } catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  const positive = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
  const entries = data?.participantes;
  if (!positive(data?.organizacaoId) || !positive(data?.edicao) || data.edicao > 2147483647 || !Array.isArray(entries) || entries.length < 4 ||
    !entries.every((entry: { jogadorId?: unknown; equipeId?: unknown } | null) => entry && positive(entry.jogadorId) && positive(entry.equipeId)) ||
    new Set(entries.map((entry: { jogadorId: number }) => entry.jogadorId)).size !== entries.length) {
    return Response.json({ detail: "Informe organização, edição positiva e no mínimo 4 participantes, sem repetir jogadores." }, { status: 400 });
  }
  return championshipRequest((await params).id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizacaoId: data.organizacaoId, edicao: data.edicao, participantes: entries.map((entry: { jogadorId: number; equipeId: number }) => ({ jogadorId: entry.jogadorId, equipeId: entry.equipeId })) }) });
}
