import { apiFetch } from "../../auth/session";

import type { NextRequest } from "next/server";

const allowed = new Set(["jogadores", "equipes", "campeonatos"]);

export async function GET(_request: NextRequest, context: { params: Promise<{ recurso: string }> }) {
  const { recurso } = await context.params;
  if (!allowed.has(recurso)) return Response.json({ detail: "Cadastro não encontrado." }, { status: 404 });
  try {
    const response = await apiFetch(`/${recurso}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) return Response.json({ detail: "Não foi possível carregar a listagem. Tente novamente." }, { status: response.status });
    return Response.json(await response.json());
  } catch {
    return Response.json({ detail: "Não foi possível conectar à API. Verifique se o serviço está em execução." }, { status: 503 });
  }
}
