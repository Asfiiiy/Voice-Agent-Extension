"use client";

import { useState, useEffect, useRef } from "react";

export default function TestCallPage() {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle");
  const [error, setError] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");
  const [agentSpeaking, setAgentSpeaking] = useState<boolean>(false);
  const [userSpeaking, setUserSpeaking] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [transcripts, setTranscripts] = useState<Array<{ sender: string; text: string }>>([]);
  const [mounted, setMounted] = useState<boolean>(false);

  const roomRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isStartingRef = useRef<boolean>(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (roomRef.current) {
        console.log("[Disconnect] app/test-call/page.tsx component unmount cleanup");
        roomRef.current.disconnect();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Poll server transcript store during active call to ensure 100% transcript visibility
  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/transcripts");
        if (res.ok) {
          const data = await res.json();
          if (data.entries && data.entries.length > 0) {
            setTranscripts(
              data.entries.map((e: any) => ({
                sender: e.role === "user" ? "You" : e.role === "agent" ? "Agent" : "System",
                text: e.text,
              }))
            );
          }
        }
      } catch (err) {
        // ignore network error
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const monitorMicrophoneVolume = (track: any) => {
    try {
      if (!track || !track.mediaStreamTrack) return;
      const mediaStream = new MediaStream([track.mediaStreamTrack]);
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicVolume(normalized);
        setUserSpeaking(normalized > 10);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (e) {
      console.error("Microphone volume monitor error:", e);
    }
  };

  const startCall = async () => {
    if (isStartingRef.current || status !== "idle") return;
    isStartingRef.current = true;
    setStatus("connecting");
    setError("");
    setTranscripts([]);

    // Prime audio element on user gesture to prevent browser autoplay delay
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }

    try {
      // Dynamically load livekit-client on client side to prevent Next.js SSR compilation hangs
      const { Room, RoomEvent, createLocalAudioTrack, Track } = await import("livekit-client");

      // 1. Fetch token and dispatch agent via API with unique room name
      const freshRoom = "test-room-" + Date.now();
      const res = await fetch(`/api/token?room=${freshRoom}`);
      if (!res.ok) {
        throw new Error("Failed to fetch LiveKit token from backend");
      }
      const data = await res.json();
      setRoomName(data.room || freshRoom);

      // 2. Connect to LiveKit room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // 3. Track subscription & audio playback binding
      room.on(RoomEvent.TrackSubscribed, (track: any) => {
        if (track.kind === Track.Kind.Audio) {
          if (audioRef.current) {
            track.attach(audioRef.current);
            audioRef.current.play().catch((err: any) => console.log("Audio play note:", err));
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: any) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach();
        }
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const isAgentSpeaking = speakers.some(
          (speaker) => speaker.identity !== room.localParticipant.identity
        );
        setAgentSpeaking(isAgentSpeaking);
      });

      room.on(RoomEvent.TranscriptionReceived, (transcriptions, participant) => {
        for (const t of transcriptions) {
          const sender = participant?.identity === room.localParticipant.identity ? "You" : "Agent";
          setTranscripts((prev) => [...prev, { sender, text: t.text }]);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        isStartingRef.current = false;
        setStatus("idle");
        setAgentSpeaking(false);
        setUserSpeaking(false);
        setMicVolume(0);
        roomRef.current = null;
      });

      const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";
      await room.connect(serverUrl, data.token);

      // 4. Request microphone permission, create and publish local audio track
      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      await room.localParticipant.publishTrack(audioTrack);
      monitorMicrophoneVolume(audioTrack);

      roomRef.current = room;
      setStatus("connected");
    } catch (err: any) {
      console.error("Test call error:", err);
      isStartingRef.current = false;
      setStatus("idle");
      setError(err.message || "Failed to establish voice call");
    }
  };

  const endCall = () => {
    isStartingRef.current = false;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    if (roomRef.current) {
      console.log("[Disconnect] app/test-call/page.tsx endCall: user clicked End Call button");
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setStatus("idle");
    setAgentSpeaking(false);
    setUserSpeaking(false);
    setMicVolume(0);
  };

  if (!mounted) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] bg-slate-950 text-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-sm">Loading Live Voice Agent...</p>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[550px] bg-slate-950 text-white font-sans">
      <h1 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
        Live Voice Agent Call Center
      </h1>
      <p className="text-sm text-slate-400 mb-8">Speak naturally into your microphone to chat with the AI support agent.</p>

      {/* Hidden Audio Element for Agent Voice Output */}
      <audio ref={audioRef} autoPlay playsInline controls={false} style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }} />

      {error && (
        <div className="mb-6 p-4 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-sm max-w-md text-center shadow-lg">
          ⚠️ {error}
        </div>
      )}

      {status === "idle" && (
        <button
          onClick={startCall}
          className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-4 px-8 rounded-full shadow-2xl transition duration-300 transform hover:scale-105 cursor-pointer"
        >
          <span className="text-2xl">🎙️</span>
          <span className="text-lg">Start Live Call</span>
        </button>
      )}

      {status === "connecting" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-300 font-medium">Connecting to Voice Agent Worker...</p>
        </div>
      )}

      {status === "connected" && (
        <div className="flex flex-col items-center gap-6 p-8 border border-slate-800 rounded-3xl bg-slate-900/90 backdrop-blur-md shadow-2xl min-w-[380px] max-w-[550px] w-full">
          {/* Header Info */}
          <div className="flex justify-between items-center w-full pb-4 border-b border-slate-800">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 tracking-wide uppercase">
              Room: {roomName}
            </span>
            <span className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE RTC
            </span>
          </div>

          {/* Visual State & Animated Mic Waveform */}
          <div className="flex flex-col items-center gap-4 py-4 w-full">
            {/* Visual Animated Orb */}
            <div className={`relative flex items-center justify-center w-28 h-28 rounded-full transition-all duration-300 ${
              agentSpeaking 
                ? "bg-emerald-500/20 ring-4 ring-emerald-500/50 scale-110 shadow-[0_0_50px_rgba(16,185,129,0.4)]" 
                : userSpeaking 
                  ? "bg-blue-500/20 ring-4 ring-blue-500/50 shadow-[0_0_50px_rgba(59,130,246,0.4)]" 
                  : "bg-slate-800 border-2 border-slate-700"
            }`}>
              <span className="text-4xl select-none">
                {agentSpeaking ? "🗣️" : userSpeaking ? "🎙️" : "🎧"}
              </span>

              {/* Pulsing ring overlay */}
              {(agentSpeaking || userSpeaking) && (
                <span className={`absolute inset-0 rounded-full animate-ping opacity-30 ${agentSpeaking ? "bg-emerald-400" : "bg-blue-400"}`}></span>
              )}
            </div>

            {/* Status Text Indicator */}
            <div className="text-center">
              <p className={`text-xl font-bold tracking-tight ${agentSpeaking ? "text-emerald-400" : userSpeaking ? "text-blue-400" : "text-slate-200"}`}>
                {agentSpeaking ? "AI Agent is Speaking..." : userSpeaking ? "Listening to Your Voice..." : "Ready & Listening..."}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {agentSpeaking ? "Listen to agent audio response" : "Speak into your microphone now"}
              </p>
            </div>

            {/* Live Microphone Audio Level Visualizer Bar */}
            <div className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">Mic Level:</span>
              <div className="flex-1 bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-75 ${
                    micVolume > 50 ? "bg-gradient-to-r from-blue-500 to-emerald-400" : "bg-blue-500"
                  }`} 
                  style={{ width: `${Math.max(5, micVolume)}%` }}
                ></div>
              </div>
              <span className="text-xs text-slate-400 font-mono w-8 text-right">{micVolume}%</span>
            </div>
          </div>

          {/* Transcript History */}
          {transcripts.length > 0 && (
            <div className="w-full bg-slate-950/80 p-4 rounded-xl border border-slate-800 max-h-[180px] overflow-y-auto space-y-2 text-sm font-sans">
              {transcripts.map((t, index) => (
                <div key={index} className={`p-2 rounded-lg ${t.sender === "You" ? "bg-blue-950/40 text-blue-200 border border-blue-800/40" : "bg-emerald-950/40 text-emerald-200 border border-emerald-800/40"}`}>
                  <span className="font-bold text-xs uppercase tracking-wide opacity-75">{t.sender}:</span> {t.text}
                </div>
              ))}
            </div>
          )}

          {/* End Call Button */}
          <button
            onClick={endCall}
            className="w-full bg-red-600/90 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition duration-200 cursor-pointer shadow-lg hover:shadow-red-600/30"
          >
            End Call
          </button>
        </div>
      )}
    </div>
  );
}