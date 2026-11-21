import type { Championship } from "../novo/championship-form";

export type LiveStatus = "connecting" | "live" | "reconnecting" | "sync-error";

export function watchChampionship(id: string, callbacks: { data: (data: Championship) => void; status: (status: LiveStatus) => void; error: (message: string) => void; removed: () => void }) {
  let closed = false, fetching = false, queued = false, revision = 0;
  let source: EventSource | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let reconnect: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  function close() {
    closed = true; source?.close(); controller.abort(); clearTimeout(retry); clearTimeout(reconnect);
  }
  function removed() { if (!closed) { close(); callbacks.removed(); } }
  async function sync() {
    if (closed) return;
    queued = true;
    if (fetching) return;
    fetching = true;
    clearTimeout(retry);
    try {
      while (queued && !closed) {
        queued = false;
        const started = revision;
        const response = await fetch(`/api/campeonatos/${id}`, { cache: "no-store", signal: controller.signal });
        if (closed) return;
        if (response.status === 404) { removed(); return; }
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Não foi possível atualizar o campeonato.");
        if (closed) return;
        if (started !== revision) { queued = true; continue; }
        callbacks.data(data);
        callbacks.error("");
        if (source?.readyState === EventSource.OPEN) callbacks.status("live");
      }
    } catch (error) {
      if (!closed) {
        callbacks.error(error instanceof Error ? error.message : "Não foi possível atualizar o campeonato.");
        callbacks.status("sync-error");
        retry = setTimeout(() => void sync(), 3000);
      }
    } finally { fetching = false; }
  }
  function matches(event: Event) {
    try { return String(JSON.parse((event as MessageEvent).data).campeonatoId) === id; } catch { return false; }
  }
  function connect() {
    if (closed) return;
    source?.close();
    source = new EventSource(`/api/campeonatos/${id}/eventos`);
    source.addEventListener("conectado", event => { if (matches(event)) { callbacks.status("connecting"); void sync(); } });
    source.addEventListener("campeonato-atualizado", event => { if (matches(event)) void sync(); });
    source.addEventListener("campeonato-excluido", event => { if (matches(event)) removed(); });
    source.onerror = () => {
      if (closed) return;
      callbacks.status("reconnecting");
      void sync(); // Also detects missed deletion and HTTP errors hidden by EventSource.
      if (source?.readyState === EventSource.CLOSED) {
        clearTimeout(reconnect);
        reconnect = setTimeout(connect, 3000);
      }
    };
  }
  callbacks.status("connecting");
  connect();
  void sync();
  return {
    close,
    update(data: Championship) { if (!closed) { revision++; callbacks.data(data); callbacks.error(""); } },
  };
}
