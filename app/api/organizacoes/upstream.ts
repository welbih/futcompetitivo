import { apiFetch } from "../auth/session";

export async function organizationWrite(request: Request, id?: string) {
  let data;
  let trophy: File | null = null;
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      data = { nome: form.get("nome"), ativo: form.get("ativo") !== "false" };
      const file = form.get("trofeu");
      if (file instanceof File && file.size > 0) trophy = file;
    } else data = await request.json();
  }
  catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  if (!data || typeof data.nome !== "string" || !data.nome.trim() || data.nome.trim().length > 255) {
    return Response.json({ detail: "Informe um nome de organização com até 255 caracteres." }, { status: 400 });
  }
  if (trophy && (trophy.size > 2 * 1024 * 1024 || !["image/png", "image/svg+xml"].includes(trophy.type))) {
    return Response.json({ detail: "Selecione um troféu PNG ou SVG de até 2 MB." }, { status: 400 });
  }
  try {
    const payload = { nome: data.nome.trim(), ativo: typeof data.ativo === "boolean" ? data.ativo : true };
    let body: string | FormData = JSON.stringify(payload);
    if (trophy) {
      body = new FormData();
      body.append("dados", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      body.append("trofeu", trophy, trophy.name);
    }
    const response = await apiFetch(id ? `/organizacoes/${id}` : "/organizacoes", {
      method: id ? "PUT" : "POST", headers: trophy ? undefined : { "Content-Type": "application/json" },
      body,
      cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ detail: "Não foi possível confirmar o cadastro da organização. Verifique a conexão e consulte os cadastros antes de tentar novamente." }, { status: 503 });
  }
}
