"use client";

import Image from "next/image";
import { useState } from "react";
import type { Organization } from "../campeonatos/novo/organization-dialog";
import styles from "./organizations.module.css";

export default function OrganizationTrophy({ organization, revision }: { organization: Organization; revision: number }) {
  const [failedSource, setFailedSource] = useState("");
  if (!organization.trofeuUrl) return null;
  const source = `/api/organizacoes/${organization.id}/trofeu?v=${revision}`;
  return <div className={styles.trophy}>
    {failedSource === source ? <span role="status">Troféu indisponível</span> : <Image src={source} alt={`Troféu de ${organization.nome}`} width={160} height={180} unoptimized onError={() => setFailedSource(source)} />}
  </div>;
}
