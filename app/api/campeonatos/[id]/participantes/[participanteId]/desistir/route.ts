import { requireAdmin } from "../../../../../auth/admin";
import { championshipRequest } from "../../../../upstream";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; participanteId: string }> }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { id, participanteId } = await params;
  if (!/^[1-9]\d*$/.test(participanteId) || !Number.isSafeInteger(Number(participanteId))) return Response.json({ detail: "Participante inválido." }, { status: 400 });
  return championshipRequest(id, { method: "POST" }, `/participantes/${participanteId}/desistir`);
}
