"use client";

import Image from "next/image";
import { useState } from "react";
import type { Participant } from "../novo/championship-form";
import styles from "./matrix-player.module.css";

export default function MatrixPlayer({ participant }: { participant: Participant }) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = participant.equipe.logoUrl?.trim();
  const usable = !!url && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url));
  return <span className={styles.player}>
    <span className={styles.logo} title={participant.equipe.nome}>{usable && failed !== url ? <Image src={url} alt={`Logo de ${participant.equipe.nome}`} width={36} height={36} unoptimized onError={() => setFailed(url)} /> : <span className={styles.fallback} role="img" aria-label={`Equipe ${participant.equipe.nome}`}>{participant.equipe.nome.slice(0, 2).toUpperCase()}</span>}</span>
    <span className={styles.name}>{participant.jogador.apelido?.trim() || participant.jogador.nome}</span>
  </span>;
}
