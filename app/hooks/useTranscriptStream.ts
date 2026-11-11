"use client";

import { useEffect, useState } from "react";

export type TranscriptRole = "agent" | "user" | "system";

export interface TranscriptEntry {
  id: string;
  role: TranscriptRole;
  text: string;
  timestamp: string;
}

export function useTranscriptStream() {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource("/api/transcripts/stream");

    eventSource.onopen = () => setIsConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "snapshot") {
          setEntries(data.entries ?? []);
          return;
        }

        if (data.type === "entry" && data.entry) {
          setEntries((prev) => [...prev.slice(-49), data.entry]);
        }
      } catch (error) {
        console.error("Transcript stream parse failed:", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  return { entries, isConnected };
}
