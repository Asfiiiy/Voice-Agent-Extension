"use client";
import React, { useState, useRef, useEffect } from "react";
import { Room, RoomEvent, createLocalAudioTrack, Track, RemoteTrack } from "livekit-client";
import {
  UploadCloud,
  FileSpreadsheet,
  PhoneOutgoing,
  Flame,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Download,
  PhoneForwarded,
  Calendar,
  Search,
  Filter,
  Sparkles,
  Bot,
  UserCheck,
  ChevronRight,
  Plus,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  Link as LinkIcon,
  RotateCcw,
  RefreshCw,
  X,
  MessageSquare,
  Save,
  Users,
  Layers,
  CheckCircle
} from "lucide-react";

export interface OutboundLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  course: string;
  priority: "hot" | "warm" | "cold" | "pending";
  score: number; // 0 to 100
  status: "pending" | "calling" | "qualified" | "transferred" | "callback_scheduled" | "not_interested";
  attemptsCount: number; // 0 to 7
  maxAttempts: number; // default 7
  cadence: "daily" | "alternate_day";
  assignedToMember?: string;
  callbackTime?: string;
  aiNotes?: string;
  lastDialed?: string;
}

const initialLeads: OutboundLead[] = [
  {
    id: "LEAD-201",
    name: "Tariq Mahmood",
    phone: "+44 7911 882233",
    email: "tariq.m@outlook.com",
    course: "Qualifi Level 5 Extended Diploma in Cyber Security",
    priority: "hot",
    score: 95,
    status: "transferred",
    attemptsCount: 1,
    maxAttempts: 7,
    cadence: "daily",
    assignedToMember: "Sarah Jenkins",
    aiNotes: "Verified £1,299 full payment option. Transferred to Sarah (Ext 101) to finalize admission.",
    lastDialed: "Today, 10:15 AM"
  },
  {
    id: "LEAD-202",
    name: "Natasha Evans",
    phone: "+44 7822 445566",
    email: "natasha.evans@gmail.com",
    course: "Qualifi Level 3 Diploma in Health and Social Care",
    priority: "hot",
    score: 91,
    status: "qualified",
    attemptsCount: 2,
    maxAttempts: 7,
    cadence: "daily",
    assignedToMember: "Hamza Ali",
    aiNotes: "Looking to work in NHS care sector. Wants £75 initial deposit form emailed. Ready for immediate enrollment.",
    lastDialed: "Today, 10:45 AM"
  },
  {
    id: "LEAD-203",
    name: "Bilal Rehman",
    phone: "+44 7700 900123",
    email: "bilal.rehman@hotmail.com",
    course: "OTHM Level 7 Diploma in Strategic Marketing",
    priority: "warm",
    score: 74,
    status: "callback_scheduled",
    attemptsCount: 1,
    maxAttempts: 7,
    cadence: "alternate_day",
    assignedToMember: "Ayesha Khan",
    callbackTime: "Tomorrow at 03:00 PM",
    aiNotes: "Caller was driving. Inquired about 8-month installment plan (£70.50/mo). Requested callback tomorrow afternoon.",
    lastDialed: "Today, 11:05 AM"
  },
  {
    id: "LEAD-204",
    name: "Chloe Richardson",
    phone: "+44 7911 332211",
    email: "chloe.r@icloud.com",
    course: "Level 3 Certificate in Phlebotomy Training (London)",
    priority: "warm",
    score: 68,
    status: "callback_scheduled",
    attemptsCount: 3,
    maxAttempts: 7,
    cadence: "daily",
    assignedToMember: "Zayn Malik",
    callbackTime: "Today at 04:30 PM",
    aiNotes: "Asked for upcoming Saturday classroom dates in London. Callback scheduled for 4:30 PM with Admissions.",
    lastDialed: "Today, 11:20 AM"
  },
  {
    id: "LEAD-205",
    name: "Daniel Walker",
    phone: "+44 7811 556677",
    email: "dwalker@yahoo.co.uk",
    course: "OTHM Level 3 Foundation Diploma in Accountancy",
    priority: "cold",
    score: 25,
    status: "not_interested",
    attemptsCount: 2,
    maxAttempts: 7,
    cadence: "daily",
    aiNotes: "Caller enrolled at a local college last week. Tagged as not interested.",
    lastDialed: "Today, 09:50 AM"
  },
  {
    id: "LEAD-206",
    name: "Amina Begum",
    phone: "+44 7722 119988",
    email: "amina.b@gmail.com",
    course: "Qualifi Level 4 Diploma in Cyber Security",
    priority: "pending",
    score: 0,
    status: "pending",
    attemptsCount: 0,
    maxAttempts: 7,
    cadence: "daily",
    aiNotes: "Uncalled lead from website contact form inquiry."
  },
  {
    id: "LEAD-207",
    name: "Oliver Smith",
    phone: "+44 7855 667788",
    email: "oliver.smith@example.com",
    course: "Level 5 Diploma in Education and Training (DET)",
    priority: "pending",
    score: 0,
    status: "pending",
    attemptsCount: 0,
    maxAttempts: 7,
    cadence: "alternate_day",
    aiNotes: "Downloaded teacher training syllabus. Scheduled for AI auto-dialing."
  }
];

export default function OutboundLeadsView() {
  const [leads, setLeads] = useState<OutboundLead[]>(initialLeads);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCampaignRunning, setIsCampaignRunning] = useState(false);
  const [cadenceMode, setCadenceMode] = useState<"daily" | "alternate_day">("daily");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Google Sheet Connect Modal State
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);

  // Incoming Screen-Pop Hand-Off Modal State
  const [screenPopData, setScreenPopData] = useState<{
    isOpen: boolean;
    leadName: string;
    phoneNumber: string;
    course: string;
    score: number;
    aiBriefing: string;
    assignedAdvisor: string;
  } | null>(null);

  // Multi-Attempt Lead Notes Modal State
  const [selectedLeadForNotes, setSelectedLeadForNotes] = useState<OutboundLead | null>(null);
  const [leadNotesHistory, setLeadNotesHistory] = useState<any[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteDisposition, setNewNoteDisposition] = useState("FOLLOW_UP_SCHEDULED");
  const [newNoteCallbackTime, setNewNoteCallbackTime] = useState("");
  const [activeAdvisor, setActiveAdvisor] = useState("Sarah Jenkins");

  const openLeadNotes = async (lead: OutboundLead) => {
    setSelectedLeadForNotes(lead);
    setNewNoteText("");
    setNewNoteDisposition(lead.status === "qualified" ? "ENROLLED" : "FOLLOW_UP_SCHEDULED");
    setNewNoteCallbackTime("");
    setIsLoadingNotes(true);
    try {
      const res = await fetch(`/api/leads/notes?phoneNumber=${encodeURIComponent(lead.phone)}`);
      if (res.ok) {
        const data = await res.json();
        setLeadNotesHistory(data.notes || []);
      } else {
        setLeadNotesHistory([]);
      }
    } catch {
      setLeadNotesHistory([]);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const saveLeadAttemptNote = async () => {
    if (!selectedLeadForNotes || !newNoteText.trim()) {
      showToast("Please enter notes for this call attempt before saving.");
      return;
    }

    try {
      const nextAttempt = leadNotesHistory.length + 1;
      const res = await fetch("/api/leads/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLeadForNotes.id,
          phoneNumber: selectedLeadForNotes.phone,
          customerName: selectedLeadForNotes.name,
          attemptNumber: nextAttempt,
          advisorName: activeAdvisor,
          disposition: newNoteDisposition,
          commentText: newNoteText,
          callbackTime: newNoteCallbackTime || null,
        }),
      });

      const data = await res.json();
      const updatedLog = data.formattedLog || `[Call #${nextAttempt} • ${activeAdvisor}]: ${newNoteText}`;

      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedLeadForNotes.id
            ? {
                ...l,
                attemptsCount: nextAttempt,
                assignedToMember: activeAdvisor,
                status:
                  newNoteDisposition === "ENROLLED"
                    ? "qualified"
                    : newNoteDisposition === "LOST"
                    ? "not_interested"
                    : "callback_scheduled",
                aiNotes: updatedLog,
              }
            : l
        )
      );

      showToast(`Call #${nextAttempt} note saved for ${selectedLeadForNotes.name}!`);
      setSelectedLeadForNotes(null);
    } catch (err) {
      console.error("Save note error:", err);
      showToast("Error saving note. Please try again.");
    }
  };

  // Live Outbound Call Connection State
  const [activeCallRoom, setActiveCallRoom] = useState<Room | null>(null);
  const [activeCallLead, setActiveCallLead] = useState<OutboundLead | null>(null);
  const [callStatus, setCallStatus] = useState<"idle" | "connecting" | "connected">("idle");
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [callTranscripts, setCallTranscripts] = useState<Array<{ role: string; text: string }>>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: any;
    let transcriptPoll: any;
    if (callStatus === "connected") {
      interval = setInterval(() => setCallSeconds((s) => s + 1), 1000);
      transcriptPoll = setInterval(async () => {
        try {
          const res = await fetch("/api/transcripts");
          if (res.ok) {
            const data = await res.json();
            if (data.entries && data.entries.length > 0) {
              setCallTranscripts(data.entries.slice(-6));
            }
          }
        } catch {}
      }, 1000);
    } else {
      setCallSeconds(0);
      setCallTranscripts([]);
      setMicVolume(0);
    }
    return () => {
      clearInterval(interval);
      clearInterval(transcriptPoll);
    };
  }, [callStatus]);

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
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (e) {
      console.warn("Microphone volume monitor notice:", e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Google Sheet Sync Handler
  const handleSyncGoogleSheet = async () => {
    if (!sheetUrl.trim()) {
      showToast("Please enter a valid Google Sheets URL");
      return;
    }

    setIsSyncingSheet(true);
    try {
      // Convert standard Google Sheet URL to CSV Export URL if needed
      let csvUrl = sheetUrl;
      if (sheetUrl.includes("/edit")) {
        csvUrl = sheetUrl.replace(/\/edit.*$/, "/export?format=csv");
      }

      showToast("Fetching live leads from Google Sheet...");
      const res = await fetch(csvUrl);
      if (!res.ok) {
        throw new Error("Unable to fetch sheet. Make sure the Google Sheet is shared as 'Anyone with link can view'.");
      }

      const csvText = await res.text();
      const lines = csvText.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        throw new Error("Google Sheet appears to be empty or has no data rows");
      }

      const importedLeads: OutboundLead[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols[0] && cols[1]) {
          importedLeads.push({
            id: `GSHEET-${Date.now().toString().slice(-4)}-${i}`,
            name: cols[0],
            phone: cols[1],
            email: cols[2] || "student@example.com",
            course: cols[3] || "Inspire London College Qualification",
            priority: "pending",
            score: 0,
            status: "pending",
            attemptsCount: 0,
            maxAttempts: 7,
            cadence: cadenceMode,
            aiNotes: cols[4] || "Imported directly from synced Google Sheet",
          });
        }
      }

      setLeads((prev) => [...importedLeads, ...prev]);
      showToast(`Successfully synced ${importedLeads.length} leads from Google Sheet!`);
      setIsSheetModalOpen(false);
      setSheetUrl("");
    } catch (err: any) {
      console.warn("Sheet sync error:", err);
      showToast(err.message || "Failed to sync Google Sheet");
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // CSV Template download
  const downloadSampleCsv = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Name,Phone,Email,Course,Notes\n" +
      "Zainab Ali,+447911990011,zainab.ali@gmail.com,Qualifi Level 5 Cyber Security,Interested in full fee discount\n" +
      "Harvey Specter,+447822554433,harvey.s@pearson.com,OTHM Level 7 International Business Law,Executive student inquiry\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_leads_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded sample leads CSV template");
  };

  // CSV File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        showToast("Error: CSV file is empty or missing headers");
        return;
      }

      const newLeads: OutboundLead[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols[0] && cols[1]) {
          newLeads.push({
            id: `LEAD-${Date.now().toString().slice(-4)}-${i}`,
            name: cols[0],
            phone: cols[1],
            email: cols[2] || "info@example.com",
            course: cols[3] || "Inspire London College Qualification",
            priority: "pending",
            score: 0,
            status: "pending",
            attemptsCount: 0,
            maxAttempts: 7,
            cadence: cadenceMode,
            aiNotes: cols[4] || "Imported from CSV Lead Sheet"
          });
        }
      }

      setLeads((prev) => [...newLeads, ...prev]);
      showToast(`Successfully imported ${newLeads.length} leads from CSV!`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const toggleCampaign = () => {
    if (isCampaignRunning) {
      setIsCampaignRunning(false);
      showToast("Outbound AI Campaign paused");
    } else {
      setIsCampaignRunning(true);
      showToast("Sonia Auto-Dialer Campaign Started! Dialing pending leads sequentially (7-Attempt Cadence)...");
    }
  };

  // Retry an unanswered lead (up to 7 attempts)
  const retryLead = (lead: OutboundLead) => {
    if (lead.attemptsCount >= lead.maxAttempts) {
      showToast(`Maximum ${lead.maxAttempts} attempts reached for ${lead.name}. Marked as Unreachable.`);
      return;
    }
    const nextAttempt = lead.attemptsCount + 1;
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, attemptsCount: nextAttempt } : l))
    );
    showToast(`Initiating Retry Attempt ${nextAttempt} of 7 for ${lead.name}...`);
    triggerManualDial(lead);
  };

  const triggerManualDial = async (lead: OutboundLead) => {
    if (activeCallRoom) {
      try {
        console.log("[Disconnect] OutboundLeadsView.tsx triggerManualDial: closing previous activeCallRoom before new dial");
        await activeCallRoom.disconnect();
      } catch {}
      setActiveCallRoom(null);
    }

    setActiveCallLead(lead);
    setCallStatus("connecting");
    showToast(`Connecting Outbound Call with Sonia for ${lead.name}...`);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? { ...l, status: "calling", attemptsCount: Math.min(l.attemptsCount + 1, 7) }
          : l
      )
    );

    let room: Room | null = null;
    try {
      const res = await fetch("/api/calls/dial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          leadName: lead.name,
          phoneNumber: lead.phone,
          courseInquired: lead.course,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || "Failed to initiate call room");
      }

      room = new Room({
        adaptiveStream: false,
        dynacast: false,
        disconnectOnPageLeave: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          if (audioRef.current) {
            track.attach(audioRef.current);
            audioRef.current.play().catch((err) => console.log("Audio autoplay note:", err));
          } else {
            const el = track.attach();
            document.body.appendChild(el);
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach();
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.srcObject = null;
        }
        setActiveCallRoom(null);
        setActiveCallLead(null);
        setCallStatus("idle");
        showToast("Call ended! AI Written Summary recorded in Outbound Calls tab.");
      });

      const targetUrl = data.url || process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://customcall-f7c2gkei.livekit.cloud";
      await room.connect(targetUrl, data.token, {
        autoSubscribe: true,
      });

      room.remoteParticipants.forEach((p) => {
        p.trackPublications.forEach((pub) => {
          if (pub.track && pub.track.kind === Track.Kind.Audio && audioRef.current) {
            pub.track.attach(audioRef.current);
            audioRef.current.play().catch(() => {});
          }
        });
      });

      let audioTrack;
      try {
        audioTrack = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
      } catch (micErr: any) {
        console.warn("Microphone access issue:", micErr);
        throw new Error("Microphone permission required to speak with agent.");
      }

      await room.localParticipant.publishTrack(audioTrack);
      monitorMicrophoneVolume(audioTrack);
      setActiveCallRoom(room);
      setCallStatus("connected");
      showToast(`Connected with Sonia! Say 'Hello' into your microphone.`);
    } catch (err: any) {
      console.warn("Dial connection note:", err);
      if (room) {
        try {
          console.log(`[Disconnect] OutboundLeadsView.tsx triggerManualDial catch block. Reason: ${err.message || "connection_error"}`);
          await room.disconnect();
        } catch {}
      }
      setActiveCallRoom(null);
      setCallStatus("idle");
      setActiveCallLead(null);
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: "pending" } : l))
      );
      showToast(err.message || "Failed to connect to agent. Please retry.");
    }
  };

  const hangUpCall = async () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {}
    }
    if (activeCallRoom) {
      activeCallRoom.localParticipant.trackPublications.forEach((pub) => {
        if (pub.track) {
          try {
            pub.track.stop();
          } catch {}
        }
      });
      try {
        console.log("[Disconnect] OutboundLeadsView.tsx hangUpCall: user clicked Hang Up Call button");
        await activeCallRoom.disconnect();
      } catch {}
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
    setActiveCallRoom(null);
    setActiveCallLead(null);
    setCallStatus("idle");
    setMicVolume(0);
    setCallTranscripts([]);
  };

  const toggleMic = () => {
    if (!activeCallRoom) return;
    const audioPub = activeCallRoom.localParticipant.audioTrackPublications.values().next().value;
    if (audioPub && audioPub.track) {
      if (isMicMuted) {
        audioPub.track.unmute();
        setIsMicMuted(false);
        showToast("Microphone unmuted");
      } else {
        audioPub.track.mute();
        setIsMicMuted(true);
        showToast("Microphone muted");
      }
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesPriority =
      filterPriority === "all" ||
      lead.priority.toLowerCase() === filterPriority.toLowerCase() ||
      (filterPriority === "pending" && lead.status === "pending");

    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.aiNotes && lead.aiNotes.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesPriority && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Hidden audio element for LiveKit audio playback */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Live Outbound Call Active Dialog / Banner */}
      {callStatus !== "idle" && activeCallLead && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-5 shadow-2xl border border-indigo-500/40 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/40">
                  <Bot className="w-6 h-6 animate-pulse" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full animate-ping"></span>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {callStatus === "connecting" ? "Connecting..." : "Live Outbound Call Active"}
                  </span>
                  <span className="font-mono text-xs text-indigo-300 font-bold">
                    {Math.floor(callSeconds / 60).toString().padStart(2, "0")}:
                    {(callSeconds % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  Sonia ↔ {activeCallLead.name} ({activeCallLead.phone})
                </h3>
                <p className="text-xs text-slate-300">
                  Inquired: <span className="text-indigo-200 font-medium">{activeCallLead.course}</span> •{" "}
                  <span className="text-amber-300">Attempt {activeCallLead.attemptsCount} of 7</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mic Volume Level Visualizer */}
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400">Mic</span>
                  <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-75 ${
                        micVolume > 20 ? "bg-emerald-400" : "bg-indigo-400"
                      }`}
                      style={{ width: `${Math.max(5, micVolume)}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-300 font-bold w-6 text-right">
                  {micVolume}%
                </span>
              </div>

              <button
                onClick={toggleMic}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  isMicMuted
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                }`}
              >
                {isMicMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                {isMicMuted ? "Unmute Mic" : "Mute Mic"}
              </button>

              <button
                onClick={hangUpCall}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-rose-600/30"
              >
                <PhoneOff className="w-4 h-4" /> End Call & Save Summary
              </button>
            </div>
          </div>

          {/* Real-Time Live Transcript Preview */}
          {callTranscripts.length > 0 && (
            <div className="mt-2 bg-slate-950/70 border border-indigo-500/20 rounded-2xl p-3 max-h-36 overflow-y-auto space-y-1.5 text-xs">
              <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Audio Transcript Stream
              </div>
              {callTranscripts.map((t, idx) => (
                <div key={idx} className="flex gap-2">
                  <span
                    className={`font-bold shrink-0 ${
                      t.role === "user" ? "text-amber-300" : "text-indigo-300"
                    }`}
                  >
                    {t.role === "user" ? "You (Lead):" : "Sonia:"}
                  </span>
                  <span className="text-slate-200">{t.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hero: Campaign Controls & Upload / Google Sheet Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                Outbound Lead Qualifier & SDR
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                7-Attempt Smart Retry Cadence
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1.5">
              Google Sheet Integration, 7-Attempt Cadence & Multi-Agent Routing
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sonia dials leads automatically. If interested, transfers to the 5 human admissions advisors. If unanswered, retries up to 7 times daily or alternate days.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Google Sheet Sync Button */}
            <button
              onClick={() => setIsSheetModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Connect Google Sheet
            </button>

            {/* CSV Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <UploadCloud className="w-4 h-4 text-indigo-600" /> Upload CSV
            </button>

            <button
              onClick={downloadSampleCsv}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Download CSV format template"
            >
              <Download className="w-3.5 h-3.5" /> Template
            </button>

            {/* Auto-Dial Campaign */}
            <button
              onClick={toggleCampaign}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition ${
                isCampaignRunning
                  ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {isCampaignRunning ? (
                <>
                  <Pause className="w-4 h-4" /> Pause Campaign
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Start AI Auto-Dialer
                </>
              )}
            </button>
          </div>
        </div>

        {/* 7-Attempt Cadence Configuration Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-slate-50/70 p-3 rounded-xl mt-4 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-700">
            <RotateCcw className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-900">Unanswered Retry Cadence:</span>
            <span>Max 7 Attempts Per Lead</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium text-[11px]">Retry Schedule:</span>
            <select
              value={cadenceMode}
              onChange={(e) => {
                const mode = e.target.value as "daily" | "alternate_day";
                setCadenceMode(mode);
                setLeads((prev) => prev.map((l) => ({ ...l, cadence: mode })));
                showToast(`Retry cadence updated to ${mode === "daily" ? "Daily (1 call/day)" : "Alternate Day (Every 2nd Day)"}`);
              }}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="daily">📅 Daily (1 Call per Day)</option>
              <option value="alternate_day">🗓️ Alternate Day (Every 2nd Day)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "all", label: "All Leads" },
            { id: "pending", label: "Pending Dial" },
            { id: "hot", label: "🔥 Hot Qualified" },
            { id: "warm", label: "Warm Leads" },
            { id: "cold", label: "Cold / Not Interested" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterPriority(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                filterPriority === item.id
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lead name, phone, course..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Lead Name & Contact</th>
                <th className="py-3.5 px-4">Target Course</th>
                <th className="py-3.5 px-4 text-center">AI Priority & Score</th>
                <th className="py-3.5 px-4">Call Disposition</th>
                <th className="py-3.5 px-4">Retry Cadence</th>
                <th className="py-3.5 px-4">AI Conversation Summary</th>
                <th className="py-3.5 px-4 text-right">Routing & Transfer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No leads match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isHot = lead.priority === "hot";
                  const isWarm = lead.priority === "warm";
                  const isCold = lead.priority === "cold";
                  const isPending = lead.priority === "pending";
                  const isMaxAttempts = lead.attemptsCount >= 7;

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isHot ? "bg-rose-50/15" : ""
                      }`}
                    >
                      {/* 1. Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{lead.name}</div>
                        <div className="font-mono text-indigo-600 text-[11px] mt-0.5">
                          {lead.phone}
                        </div>
                        <div className="text-[10px] text-slate-400">{lead.email}</div>
                      </td>

                      {/* 2. Target Course */}
                      <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs">
                        <div className="truncate" title={lead.course}>
                          {lead.course}
                        </div>
                        {lead.lastDialed && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Last Dialed: {lead.lastDialed}
                          </span>
                        )}
                      </td>

                      {/* 3. AI Priority & Score */}
                      <td className="py-3.5 px-4 text-center">
                        {isHot && (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 flex items-center gap-1 border border-rose-200">
                              <Flame className="w-3 h-3 text-rose-600 fill-rose-500" /> HOT LEAD
                            </span>
                            <span className="text-[10px] font-bold text-rose-600 mt-1">
                              {lead.score}% Score
                            </span>
                          </div>
                        )}
                        {isWarm && (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              WARM
                            </span>
                            <span className="text-[10px] font-bold text-amber-700 mt-1">
                              {lead.score}% Score
                            </span>
                          </div>
                        )}
                        {isCold && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            COLD ({lead.score}%)
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                            PENDING DIAL
                          </span>
                        )}
                      </td>

                      {/* 4. Call Disposition */}
                      <td className="py-3.5 px-4">
                        {lead.status === "transferred" && (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Transferred
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              {lead.assignedToMember || "Sarah Jenkins"}
                            </span>
                          </div>
                        )}
                        {lead.status === "callback_scheduled" && (
                          <div className="flex flex-col items-start gap-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-indigo-600" /> Callback Booked
                            </span>
                            <span className="text-[10px] font-medium text-slate-600">
                              {lead.callbackTime}
                            </span>
                          </div>
                        )}
                        {lead.status === "qualified" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-max">
                            <Sparkles className="w-3 h-3 text-amber-600" /> Qualified by AI
                          </span>
                        )}
                        {lead.status === "calling" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-max animate-pulse">
                            <PhoneOutgoing className="w-3 h-3 text-rose-600 animate-spin" /> Dialing
                            Now...
                          </span>
                        )}
                        {lead.status === "not_interested" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                            Not Interested
                          </span>
                        )}
                        {lead.status === "pending" && (
                          <span className="text-[10px] text-slate-400 font-mono">In Queue</span>
                        )}
                      </td>

                      {/* 5. 7-Attempt Cadence Tracker */}
                      <td className="py-3.5 px-4 min-w-[120px]">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isMaxAttempts
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : lead.attemptsCount > 0
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                : "bg-slate-50 text-slate-500"
                            }`}
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            {lead.attemptsCount} / 7 Attempts
                          </span>
                          <span className="text-[9px] text-slate-400 block font-medium">
                            {lead.cadence === "daily" ? "Daily Cadence" : "Alternate Day Cadence"}
                          </span>
                        </div>
                      </td>

                      {/* 6. AI Notes */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-sm">
                        <p className="text-[11px] leading-relaxed line-clamp-2" title={lead.aiNotes}>
                          {lead.aiNotes}
                        </p>
                      </td>

                      {/* 7. Routing & Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.status === "pending" ? (
                            <button
                              onClick={() => triggerManualDial(lead)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-2xs transition"
                            >
                              <PhoneOutgoing className="w-3 h-3" /> Dial with AI
                            </button>
                          ) : lead.status === "qualified" || isHot ? (
                            <button
                              onClick={() => {
                                setScreenPopData({
                                  isOpen: true,
                                  leadName: lead.name,
                                  phoneNumber: lead.phone,
                                  course: lead.course,
                                  score: lead.score || 95,
                                  aiBriefing: lead.aiNotes || "Caller expressed high interest in course installments. Ready to finalize admission.",
                                  assignedAdvisor: "Sarah Jenkins",
                                });
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-2xs transition"
                            >
                              <PhoneForwarded className="w-3 h-3" /> Live Transfer
                            </button>
                          ) : (
                            <button
                              onClick={() => retryLead(lead)}
                              disabled={isMaxAttempts}
                              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-medium transition flex items-center gap-1 ${
                                isMaxAttempts
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  : "bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700"
                              }`}
                              title={isMaxAttempts ? "Max attempts reached" : "Retry lead"}
                            >
                              <RotateCcw className="w-3 h-3" /> Retry ({lead.attemptsCount}/7)
                            </button>
                          )}
                          <button
                            onClick={() => openLeadNotes(lead)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition"
                            title="View Call Notes History & Log Next Note"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Google Sheets Connect Modal */}
      {isSheetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-100" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Connect Live Google Sheet Leads
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sync website form leads and assign across all 5 team members
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSheetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Google Sheet Shareable Link
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XR.../edit"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 Tip: Make sure your Google Sheet is shared with "Anyone with the link can view".
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-800 block text-[11px]">Required Sheet Columns:</span>
                <p className="text-slate-600 text-[11px] font-mono">
                  Column A: Name | Column B: Phone | Column C: Email | Column D: Course | Column E: Notes
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setIsSheetModalOpen(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSyncGoogleSheet}
                disabled={isSyncingSheet}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? "animate-spin" : ""}`} />
                {isSyncingSheet ? "Syncing Sheet..." : "Sync & Import Leads"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Screen-Pop Notification Modal (When AI transfers to human advisor) */}
      {screenPopData?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-90 duration-200">
            {/* Flashing Ring Alert Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold">
                    <PhoneForwarded className="w-6 h-6 animate-bounce" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-emerald-600 rounded-full animate-ping"></span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block">
                    Live Call Hand-Off Alert
                  </span>
                  <h3 className="font-extrabold text-base text-white mt-0.5">
                    Sonia is Transferring a Lead!
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setScreenPopData(null)}
                className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Screen-Pop Lead Briefing & AI Context */}
            <div className="p-6 space-y-4">
              {/* Student Info Card */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">{screenPopData.leadName}</h4>
                  <p className="font-mono text-xs text-indigo-600 font-bold mt-0.5">{screenPopData.phoneNumber}</p>
                  <p className="text-xs text-slate-600 mt-1">{screenPopData.course}</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                    <Flame className="w-3 h-3 text-rose-600 fill-rose-500" /> HOT LEAD
                  </span>
                  <span className="block text-xs font-bold text-slate-700 mt-1">
                    {screenPopData.score}% Match Score
                  </span>
                </div>
              </div>

              {/* What was discussed before picking up (AI Briefing) */}
              <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-indigo-900 font-extrabold text-xs uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>AI Conversation Briefing (Before Answering):</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-sans font-medium">
                  "{screenPopData.aiBriefing}"
                </p>
              </div>

              {/* Assigned Advisor Info */}
              <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                <span>Routing to: <strong className="text-slate-800">{screenPopData.assignedAdvisor} (Ext 101)</strong></span>
                <span className="text-emerald-600 font-bold">Line Connected & Waiting</span>
              </div>
            </div>

            {/* Accept / Decline Action Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setScreenPopData(null);
                  showToast("Call declined. Forwarding to next available advisor...");
                }}
                className="w-1/2 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <PhoneOff className="w-3.5 h-3.5" /> Decline / Pass
              </button>

              <button
                onClick={() => {
                  setScreenPopData(null);
                  showToast(`Call accepted by ${screenPopData.assignedAdvisor}! Audio connected.`);
                }}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 animate-pulse"
              >
                <PhoneCall className="w-3.5 h-3.5" /> Accept & Answer Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Attempt Call History & Next Note Modal */}
      {selectedLeadForNotes && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                  <MessageSquare className="w-5 h-5 text-emerald-100" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    Lead Call History & Note Thread
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                      Call #{leadNotesHistory.length + 1}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lead: <span className="font-semibold text-slate-800">{selectedLeadForNotes.name}</span> •{" "}
                    <span className="font-mono">{selectedLeadForNotes.phone}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeadForNotes(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Previous Calls Timeline */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Past Calls Timeline ({leadNotesHistory.length} calls logged)
                </span>

                {isLoadingNotes ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading call notes history...</div>
                ) : leadNotesHistory.length === 0 ? (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-500">
                    No prior call notes logged yet. Log your first note for <strong>Call #1</strong> below.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    {leadNotesHistory.map((n, idx) => (
                      <div
                        key={n.id || idx}
                        className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs space-y-1.5 relative"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700">
                              Call #{n.attemptNumber}
                            </span>
                            <span className="font-bold text-slate-800 text-[11px]">{n.advisorName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(n.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} •{" "}
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-slate-700 font-sans italic text-[11px]">"{n.commentText}"</p>
                        <div className="flex items-center gap-2 pt-0.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              n.disposition === "ENROLLED"
                                ? "bg-emerald-100 text-emerald-800"
                                : n.disposition === "PAYMENT_PENDING"
                                ? "bg-blue-100 text-blue-800"
                                : n.disposition === "CALLBACK_SCHEDULED"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {n.disposition}
                          </span>
                          {n.callbackTime && (
                            <span className="text-[10px] text-amber-700 font-medium">
                              Callback:{" "}
                              {new Date(n.callbackTime).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form: Add Note for Next Call */}
              <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Log Notes for Call #{leadNotesHistory.length + 1}
                  </span>
                  <select
                    value={activeAdvisor}
                    onChange={(e) => setActiveAdvisor(e.target.value)}
                    className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 outline-none cursor-pointer"
                  >
                    <option value="Sarah Jenkins">Sarah Jenkins (Ext 101)</option>
                    <option value="Hamza Ali">Hamza Ali (Ext 102)</option>
                    <option value="Ayesha Khan">Ayesha Khan (Ext 103)</option>
                    <option value="Zayn Malik">Zayn Malik (Ext 104)</option>
                    <option value="David Miller">David Miller (Ext 105)</option>
                  </select>
                </div>

                {/* Outcome Dropdown */}
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Call #{leadNotesHistory.length + 1} Student Outcome / Disposition
                  </label>
                  <select
                    value={newNoteDisposition}
                    onChange={(e) => setNewNoteDisposition(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="FOLLOW_UP_SCHEDULED">🟡 Callback Rescheduled</option>
                    <option value="ENROLLED">🟢 Enrolled & Deposit Paid</option>
                    <option value="PAYMENT_PENDING">🔵 Payment / Invoice Pending</option>
                    <option value="NO_ANSWER">⚪ No Answer / Voicemail</option>
                    <option value="LOST">🔴 Not Interested / Lost</option>
                  </select>
                </div>

                {/* Optional Callback Reschedule Picker */}
                {newNoteDisposition === "FOLLOW_UP_SCHEDULED" && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Rescheduled Callback Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newNoteCallbackTime}
                      onChange={(e) => setNewNoteCallbackTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {/* Comment Textarea */}
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Conversation Notes for Call #{leadNotesHistory.length + 1}
                  </label>
                  <textarea
                    rows={3}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder={`E.g. Spoke with ${selectedLeadForNotes.name} on Call #${leadNotesHistory.length + 1}. Customer requested callback...`}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setSelectedLeadForNotes(null)}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={saveLeadAttemptNote}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save Call #{leadNotesHistory.length + 1} Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
