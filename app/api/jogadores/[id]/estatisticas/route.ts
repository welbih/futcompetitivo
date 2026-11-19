import { playerRequest, validPlayerId } from "../../upstream";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validPlayerId(id)) return Response.json({ detail: "Jogador inválido." }, { status: 400 });
  const origem = new URL(request.url).searchParams.get("origem") ?? "TODOS";
  if (!["TODOS", "CAMPEONATO", "X1"].includes(origem)) return Response.json({ detail: "Origem inválida." }, { status: 400 });
  return playerRequest(`/${id}/estatisticas?origem=${origem}`);
}
