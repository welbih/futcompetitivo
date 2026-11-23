// html-to-image deep-clones SVGs without computing styles for their descendants.
// Materialize their presentation before capture so external CSS is not required.
export function createBracketCaptureClone(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement;
  const originals = source.querySelectorAll<SVGElement>("svg, svg *");
  const copies = clone.querySelectorAll<SVGElement>("svg, svg *");
  const properties = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset", "opacity", "color", "vector-effect"];
  originals.forEach((original, index) => {
    const copy = copies[index];
    if (!copy) return;
    const computed = getComputedStyle(original);
    for (const property of properties) {
      const value = computed.getPropertyValue(property);
      if (value) copy.style.setProperty(property, value, "important");
    }
    copy.style.setProperty("transition", "none", "important");
    copy.style.setProperty("animation", "none", "important");
  });
  clone.style.zoom = "1";
  clone.style.margin = "0";
  return clone;
}
