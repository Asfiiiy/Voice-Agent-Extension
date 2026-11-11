"use client";

import { useState, useEffect } from "react";

export interface ActiveCall {
  isCallActive: boolean;
  callId: string | null;
  caller: string;
  phoneNumber: string;
  startTime: number | null;
  status: "ANSWERED" | "IN_PROGRESS" | "IDLE";
}

export interface CallMetrics {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgWaitTime: string;
  avgDuration: string;
  activeCall?: ActiveCall;
}

export function useLiveCalls(initialMetrics: CallMetrics) {
  const [metrics, setMetrics] = useState<CallMetrics>(initialMetrics);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Keep internal state updated when initial load returns from REST API
  useEffect(() => {
    if (initialMetrics.totalCalls > 0 || initialMetrics.activeCall) {
      setMetrics(initialMetrics);
    }
  }, [initialMetrics]);

  useEffect(() => {
    // Instantiate Server-Sent Events listener
    const eventSource = new EventSource("/api/calls/stream");

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);

        // Filter out system pings
        if (parsedData.type === "CONNECTED") return;

        setMetrics((prevMetrics) => ({
          ...prevMetrics,
          ...parsedData,
        }));
      } catch (err) {
        console.error("Failed to parse live metric stream:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource stream disconnected:", err);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  return { metrics, isConnected };
}