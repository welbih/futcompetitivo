import { validId, x1Request } from "../upstream";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(Number(id))) return Response.json({ detail: "Confronto inválido." }, { status: 400 });
  return x1Request(`/${id}`);
}
