export async function POST(request: Request) {
  let data;
  try { data = await request.json(); }
  catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  if (!data || typeof data.nome !== "string" || !data.nome.trim() || data.nome.trim().length > 255) {
    return Response.json({ detail: "Informe um nome de organização com até 255 caracteres." }, { status: 400 });
  }
  try {
    const base = (process.env.FUTCOMPETITIVO_API_URL || "http://localhost:8080").replace(/\/$/, "");
    const response = await fetch(`${base}/organizacoes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: data.nome.trim(), ativo: true }),
      cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ detail: "Não foi possível confirmar o cadastro da organização. Verifique a conexão e consulte os cadastros antes de tentar novamente." }, { status: 503 });
  }
}
