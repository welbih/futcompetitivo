import { cookies } from "next/headers";
import { apiFetch, sameOrigin, sessionCookie, sessionUser } from "./session";
import { validYoutubeUrl } from "../../components/youtube-url";

export async function validateYoutube(request: Request, data: Record<string, unknown>, resource: "x1" | "campeonatos", id: string, matchId: string) {
  if (!("youtubeUrl" in data)) {
    // Result edits by other callers must preserve the existing video.
    try {
      const response = await apiFetch(`/${resource}/${id}`);
      if (!response.ok) return Response.json({ detail: "Não foi possível consultar a partida antes de salvar." }, { status: response.status });
      const current = await response.json();
      const matches = resource === "x1" ? current.partidas : current.fases?.flatMap((phase: { rodadas: { partidas: { id: number; youtubeUrl?: string }[] }[] }) => phase.rodadas.flatMap(round => round.partidas));
      const match = matches?.find((match: { id: number }) => String(match.id) === matchId);
      if (!match) return Response.json({ detail: "Partida não encontrada." }, { status: 404 });
      data.youtubeUrl = match.youtubeUrl || null;
      return null;
    } catch { return Response.json({ detail: "Não foi possível consultar a partida antes de salvar." }, { status: 503 }); }
  }
  if (!sameOrigin(request)) return Response.json({ detail: "Origem inválida." }, { status: 403 });
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !sessionUser(token)?.isAdmin) return Response.json({ detail: "Somente administradores podem alterar o link do YouTube." }, { status: 403 });
  if (!validYoutubeUrl(data.youtubeUrl)) return Response.json({ detail: "Informe um endereço válido do YouTube." }, { status: 400 });
  return null;
}
