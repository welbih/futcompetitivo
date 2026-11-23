import { createBracketCaptureClone } from "./bracket-capture";

export async function downloadStandings(source: HTMLElement, title: string) {
  const { toBlob } = await import("html-to-image");
  await document.fonts.ready;
  const clone = createBracketCaptureClone(source);
  clone.querySelectorAll("[data-capture-ignore]").forEach(element => element.remove());
  const heading = clone.querySelector("h3");
  if (heading) heading.textContent = title;
  const width = Math.max(source.offsetWidth, (source.querySelector("table")?.scrollWidth || 0) + 2, 720);
  Object.assign(clone.style, { width: `${width}px`, maxWidth: "none", overflow: "visible" });
  const scroll = clone.querySelector<HTMLElement>("[data-standings-scroll]");
  if (scroll) Object.assign(scroll.style, { width: "100%", overflow: "visible", maxHeight: "none", height: "auto" });
  clone.querySelectorAll<HTMLElement>("th, td").forEach(cell => cell.style.setProperty("position", "static", "important"));
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, { position: "fixed", left: "-100000px", top: "0", pointerEvents: "none" });
  host.appendChild(clone);
  (source.parentElement || document.body).appendChild(host);
  try {
    const blob = await toBlob(clone, { width, height: clone.scrollHeight, pixelRatio: 2, skipFonts: true, includeQueryParams: true, backgroundColor: getComputedStyle(source).getPropertyValue("--panel").trim() || "#0a1240", imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" });
    if (!blob) throw new Error("Não foi possível gerar a imagem.");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `classificacao-${title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.png`;
    link.href = url; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally { host.remove(); }
}
