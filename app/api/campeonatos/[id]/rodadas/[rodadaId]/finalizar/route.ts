import { championshipRequest } from "../../../../upstream";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; rodadaId: string }> }) {
  const { id, rodadaId } = await params;
  if (!/^[1-9]\d*$/.test(rodadaId) || !Number.isSafeInteger(Number(rodadaId))) return Response.json({ detail: "Rodada inválida." }, { status: 400 });
  return championshipRequest(id, { method: "POST" }, `/rodadas/${rodadaId}/finalizar`);
}
