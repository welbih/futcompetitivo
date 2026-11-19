"use client";

import { useId } from "react";
import styles from "./player-jersey.module.css";

type Props = { player: { nome: string; apelido: string | null }; away?: boolean; compact?: boolean };

export default function PlayerJersey({ player, away = false, compact = false }: Props) {
  const gradientId = useId();
  const playerName = player.apelido?.trim() || player.nome;
  const printedName = playerName.toLocaleUpperCase("pt-BR");
  return <div className={`${styles.jersey}${compact ? ` ${styles.compact}` : ""}`} aria-label={`Camisa de ${playerName}`}>
      <svg viewBox="0 0 280 250" aria-hidden="true" className={styles.jerseyShape}>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><stop stopColor={away ? "#fff3b8" : "#203a9c"} /><stop offset=".5" stopColor={away ? "#f5c542" : "#12206b"} /><stop offset="1" stopColor={away ? "#b88a10" : "#080f33"} /></linearGradient></defs>
        <path d="M98 22 61 33 16 86 53 120 77 95 77 231Q140 247 203 231L203 95 227 120 264 86 219 33 182 22Q140 49 98 22Z" fill={`url(#${gradientId})`} stroke={away ? "#12206b" : "#f5c542"} strokeWidth="2" strokeLinejoin="round" />
        <path d="M98 22Q140 49 182 22L172 39Q140 59 108 39Z" fill={away ? "#12206b" : "#f5c542"} /><path d="m22 80 37 32m162 0 37-32" stroke={away ? "#12206b" : "#f5c542"} strokeWidth="8" />
        <path d="M84 101v122m112-122v122" stroke="#ffffff0d" strokeWidth="2" /><path d="M92 222q48 12 96 0" fill="none" stroke={away ? "#12206b66" : "#f5c54255"} strokeWidth="2" />
        <path d="M112 53h56" stroke="#ffffff14" strokeWidth="2" />
        <g fill={away ? "#101c63" : "#ffe58a"} textAnchor="middle">
          <text x="140" y="66" fontSize="6" letterSpacing=".7" fontFamily="Arial, sans-serif">FUTEBOL COMPETITIVO</text>
          <text x="140" y="94" fontSize="16" fontWeight="700" fontFamily="Oswald, Arial, sans-serif" textLength={Math.min(112, Array.from(printedName).length * 9)} lengthAdjust="spacingAndGlyphs">{printedName}</text>
          <text x="140" y="164" fontSize="18">★</text>
          <text x="140" y="204" fontSize="40" fontFamily="Bebas Neue, Impact, sans-serif">FC</text>
        </g>
      </svg>
      <h2 className="sr-only">{playerName}</h2>
    </div>;
}
