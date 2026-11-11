"use client";

import React, { useEffect, useState } from "react";
import { Phone, Search, Filter, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { type TranscriptEntry, useTranscriptStream } from "../hooks/useTranscriptStream";

interface CallLog {
  id: string;
  callerName: string;
  phoneNumber: string;
  duration: string;
  agentAssigned: string;
  status: "Completed" | "Missed" | "In Progress";
  timestamp: string;
  transcript: string;
}

const mockCalls: CallLog[] = [
  {
    id: "CALL-1082",
    callerName: "Sarah Jenkins",
    phoneNumber: "+1 (555) 234-5678",
    duration: "04:12",
    agentAssigned: "Alex Rivera",
    status: "Completed",
    timestamp: "10 minutes ago",
    transcript: "Customer requested account verification and billing update for invoice #4029...",
  },
  {
    id: "CALL-1081",
    callerName: "David Miller",
    phoneNumber: "+1 (555) 876-5432",
    duration: "00:00",
    agentAssigned: "Unassigned",
    status: "Missed",
    timestamp: "25 minutes ago",
    transcript: "No transcript available (Caller disconnected after 42 seconds in queue).",
  },
  {
    id: "CALL-1080",
    callerName: "Emma Watson",
    phoneNumber: "+1 (555) 345-6789",
    duration: "02:45",
    agentAssigned: "Jordan Lee",
    status: "In Progress",
    timestamp: "Active now",
    transcript: "Inquiring about enterprise tier upgrade options and seat expansion...",
  },
];

export default function CallsPage() {
  const [search, setSearch] = useState("");
  const [selectedTranscript, setSelectedTranscript] = useState<CallLog | null>(null);
  const [liveEntries, setLiveEntries] = useState<TranscriptEntry[]>([]);
  const [selectedLiveEntry, setSelectedLiveEntry] = useState<TranscriptEntry | null>(null);
  const { entries } = useTranscriptStream();

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const res = await fetch("/api/transcripts");
        const data = await res.json();
        if (Array.isArray(data.entries)) setLiveEntries(data.entries);
      } catch (error) {
        console.error("Failed to fetch transcript entries", error);
      }
    };

    loadEntries();
  }, []);

  useEffect(() => {
    if (entries.length > 0) {
      setLiveEntries(entries);
    }
  }, [entries]);

  const filteredCalls = mockCalls.filter(
    (call) =>
      call.callerName.toLowerCase().includes(search.toLowerCase()) ||
      call.phoneNumber.includes(search) ||
      call.agentAssigned.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Call Logs & Transcripts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor incoming calls, agent distribution, and transcripts in real time.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Live Conversation</p>
            <h2 className="mt-1 text-lg font-bold text-slate-800">Agent transcript feed</h2>
          </div>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {liveEntries.length === 0 ? (
            <p className="text-xs text-slate-500">No transcript entries yet.</p>
          ) : (
            liveEntries.slice(-6).reverse().map((entry) => (
              <div key={entry.id} className={`rounded-xl border px-3 py-2 text-xs ${
                entry.role === "agent"
                  ? "bg-slate-900 text-white border-slate-900"
                  : entry.role === "user"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-slate-50 text-slate-700 border-slate-200"
              }`}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-semibold uppercase tracking-wide">{entry.role}</span>
                  <button
                    onClick={() => setSelectedLiveEntry(entry)}
                    className="text-[10px] font-medium underline underline-offset-2"
                  >
                    Preview
                  </button>
                </div>
                <p className="leading-relaxed">{entry.text}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by caller, phone number, or agent..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          Filter
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="py-3.5 px-4">Call ID</th>
              <th className="py-3.5 px-4">Caller</th>
              <th className="py-3.5 px-4">Phone Number</th>
              <th className="py-3.5 px-4">Duration</th>
              <th className="py-3.5 px-4">Agent Assigned</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Transcript</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredCalls.map((call) => (
              <tr key={call.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-800">{call.id}</td>
                <td className="py-3.5 px-4 font-medium text-slate-900">{call.callerName}</td>
                <td className="py-3.5 px-4 text-slate-500">{call.phoneNumber}</td>
                <td className="py-3.5 px-4 font-mono text-slate-600">{call.duration}</td>
                <td className="py-3.5 px-4">{call.agentAssigned}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      call.status === "Completed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : call.status === "Missed"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {call.status === "Completed" && <CheckCircle2 className="w-3 h-3" />}
                    {call.status === "Missed" && <XCircle className="w-3 h-3" />}
                    {call.status === "In Progress" && <Clock className="w-3 h-3 animate-spin" />}
                    {call.status}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <button
                    onClick={() => setSelectedTranscript(call)}
                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Preview
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transcript Modal Preview */}
      {selectedTranscript && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Transcript — {selectedTranscript.callerName}
              </h3>
              <button
                onClick={() => setSelectedTranscript(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              "{selectedTranscript.transcript}"
            </p>
            <div className="text-right">
              <button
                onClick={() => setSelectedTranscript(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedLiveEntry && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Live transcript — {selectedLiveEntry.role}
              </h3>
              <button
                onClick={() => setSelectedLiveEntry(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              "{selectedLiveEntry.text}"
            </p>
            <div className="text-right">
              <button
                onClick={() => setSelectedLiveEntry(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}