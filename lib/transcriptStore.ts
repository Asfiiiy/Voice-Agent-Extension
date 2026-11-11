export type TranscriptRole = "agent" | "user" | "system";

export interface TranscriptEntry {
  id: string;
  role: TranscriptRole;
  text: string;
  timestamp: string;
}

const transcriptStore = {
  entries: [] as TranscriptEntry[],
  listeners: new Set<(entry: TranscriptEntry) => void>(),
};

export function addTranscriptEntry(entry: Omit<TranscriptEntry, "id" | "timestamp">) {
  const payload: TranscriptEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
  };

  transcriptStore.entries = [...transcriptStore.entries.slice(-49), payload];
  transcriptStore.listeners.forEach((listener) => listener(payload));

  return payload;
}

export function getTranscriptEntries() {
  return [...transcriptStore.entries];
}

export function subscribeToTranscript(listener: (entry: TranscriptEntry) => void) {
  transcriptStore.listeners.add(listener);
  return () => transcriptStore.listeners.delete(listener);
}

export function seedTranscriptEntries() {
  if (transcriptStore.entries.length > 0) return transcriptStore.entries;

  const seeded = [
    {
      id: "seed-system",
      role: "system",
      text: "Voice agent is ready to take calls.",
      timestamp: new Date().toISOString(),
    },
  ] as TranscriptEntry[];

  transcriptStore.entries = seeded;
  return seeded;
}
