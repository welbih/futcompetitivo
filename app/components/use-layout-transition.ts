"use client";

import { useLayoutEffect, useRef } from "react";

type Position = { x: number; y: number; value: string | undefined };

// Stable keys let an item move from its previous position without changing DOM order.
export function useLayoutTransition(version: string) {
  const root = useRef<HTMLDivElement>(null);
  const previous = useRef(new Map<string, Position>());
  const animations = useRef(new Map<string, Animation>());
  useLayoutEffect(() => {
    if (!root.current) return;
    animations.current.forEach(animation => animation.cancel());
    animations.current.clear();
    const origin = root.current.getBoundingClientRect();
    const next = new Map<string, Position>();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = root.current.querySelectorAll<HTMLElement>("[data-motion-key]");
    for (const element of items) {
      const key = element.dataset.motionKey!;
      const rect = element.getBoundingClientRect();
      const position = { x: rect.left - origin.left, y: rect.top - origin.top, value: element.dataset.motionValue };
      next.set(key, position);
      const old = previous.current.get(key);
      const changed = old && old.value !== position.value;
      const moved = old && (Math.abs(old.x - position.x) > 1 || Math.abs(old.y - position.y) > 1);
      if (!reduced && typeof element.animate === "function" && previous.current.size && (moved || changed || !old)) {
        animations.current.get(key)?.cancel();
        const scale = element.offsetWidth ? rect.width / element.offsetWidth || 1 : 1;
        const animation = moved
          ? element.animate([{ transform: `translate(${(old.x - position.x) / scale}px, ${(old.y - position.y) / scale}px)` }, { transform: "translate(0, 0)" }], { duration: 700, easing: "cubic-bezier(.22,1,.36,1)" })
          : element.animate([{ opacity: .4, transform: "translateX(-12px)", filter: "brightness(1.5)" }, { opacity: 1, transform: "translateX(0)", filter: "brightness(1)" }], { duration: 800, easing: "ease-out" });
        animations.current.set(key, animation);
      }
    }
    previous.current = next;
  }, [version]);
  useLayoutEffect(() => {
    const active = animations.current;
    return () => { active.forEach(animation => animation.cancel()); active.clear(); };
  }, []);
  return root;
}
