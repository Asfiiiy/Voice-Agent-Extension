export interface ActiveCall {
  isCallActive: boolean;
  callId: string | null;
  caller: string;
  phoneNumber: string;
  startTime: number | null;
  status: "ANSWERED" | "IN_PROGRESS" | "IDLE";
}

export interface LiveCallUpdate {
  activeCall: ActiveCall;
  totalCalls?: number;
  answeredCalls?: number;
  missedCalls?: number;
  avgWaitTime?: string;
  avgDuration?: string;
}

let currentActiveCall: ActiveCall = {
  isCallActive: false,
  callId: null,
  caller: "None",
  phoneNumber: "",
  startTime: null,
  status: "IDLE",
};

const listeners = new Set<(update: LiveCallUpdate) => void>();

export function getActiveCall(): ActiveCall {
  return { ...currentActiveCall };
}

export function setActiveCall(call: Partial<ActiveCall>): ActiveCall {
  currentActiveCall = {
    ...currentActiveCall,
    ...call,
    isCallActive: true,
    startTime: call.startTime || Date.now(),
  };
  broadcastLiveCall({ activeCall: currentActiveCall });
  return currentActiveCall;
}

export function clearActiveCall(): ActiveCall {
  currentActiveCall = {
    isCallActive: false,
    callId: null,
    caller: "None",
    phoneNumber: "",
    startTime: null,
    status: "IDLE",
  };
  broadcastLiveCall({ activeCall: currentActiveCall });
  return currentActiveCall;
}

export function broadcastLiveCall(update: LiveCallUpdate): void {
  listeners.forEach((listener) => {
    try {
      listener(update);
    } catch (err) {
      console.error("Error in live call listener:", err);
    }
  });
}

export function subscribeToLiveCalls(listener: (update: LiveCallUpdate) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
