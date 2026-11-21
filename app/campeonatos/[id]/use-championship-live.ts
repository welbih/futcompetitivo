"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Championship } from "../novo/championship-form";
import { watchChampionship, type LiveStatus } from "./championship-live";

export function useChampionshipLive(id: string) {
  const [data, setData] = useState<Championship | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [deletedId, setDeletedId] = useState<string | null>(null);
  const connection = useRef<ReturnType<typeof watchChampionship> | null>(null);
  useEffect(() => {
    const watcher = watchChampionship(id, { data: setData, error: setError, status: setStatus, removed: () => { setDeletedId(id); setData(null); } });
    connection.current = watcher;
    return () => { watcher.close(); connection.current = null; };
  }, [id]);
  const update = useCallback((updated: Championship) => connection.current?.update(updated), []);
  return { championship: data?.id === Number(id) ? data : null, update, error, status, removed: deletedId === id };
}
