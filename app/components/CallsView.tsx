"use client";

import React, { useState } from "react";
import {
  Phone,
  Search,
  Filter,
  FileText,
  Volume2,
  Download,
  Calendar,
  Clock,
  User,
  ArrowUpDown,
  RefreshCw,
  X,
  Play,
  Pause,
  CheckCircle2,
  PhoneIncoming,
  PhoneOff
} from "lucide-react";

interface CallRecord {
  id: string;
  phoneNumber: string;
  customerName: string | null;
  status: string;
  waitTimeSec: number;
  durationSec: number;
  recordingUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface CallsViewProps {
  calls?: CallRecord[];
  onRefresh?: () => void;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return "00:00";
  const mins = Math.floor(sec / 60);
  const remainingSecs = Math.floor(sec % 60);
  return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
}

export default function CallsView({ calls = [], onRefresh }: CallsViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  const filteredCalls = calls.filter((c) => {
    const matchesSearch =
      (c.phoneNumber && c.phoneNumber.toLowerCase().includes(search.toLowerCase())) ||
      (c.customerName && c.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (c.notes && c.notes.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "answered" && c.status.toLowerCase().includes("answered")) ||
      (statusFilter === "missed" && c.status.toLowerCase().includes("missed"));

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone, student name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Call Outcomes</option>
              <option value="answered">Answered Calls Only</option>
              <option value="missed">Missed / Abandoned</option>
            </select>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition shadow-2xs"
              title="Refresh Calls List"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Official Call Logs & Audio Recordings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review caller interactions, playback real-time recordings, and inspect transcript accuracy.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            Total Records: {filteredCalls.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100 text-[10px]">
              <tr>
                <th className="py-3 px-5">Student / Caller</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Call Time</th>
                <th className="py-3 px-4">Audio Playback</th>
                <th className="py-3 px-5 text-right">Transcript</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Phone className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-50" />
                    No call records matching your current filter.
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                          {(call.customerName || "S")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{call.customerName || "Admissions Inquirer"}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {call.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {call.phoneNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          call.status.toLowerCase().includes("answered")
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {call.status.toLowerCase().includes("answered") ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <PhoneOff className="w-3 h-3 text-rose-600" />
                        )}
                        {call.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {formatDuration(call.durationSec)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(call.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
                      {new Date(call.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </td>
                    <td className="py-3.5 px-4">
                      {call.recordingUrl ? (
                        <div className="flex items-center gap-2">
                          <audio
                            controls
                            preload="metadata"
                            src={call.recordingUrl}
                            className="h-7 w-40 rounded-lg shadow-2xs"
                          />
                          <a
                            href={call.recordingUrl}
                            download={`call-${call.customerName || "student"}-${call.phoneNumber}.wav`}
                            className="p-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition"
                            title="Download Audio WAV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <Volume2 className="w-3 h-3 text-slate-300" /> No Audio
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-lg font-semibold text-[11px] transition shadow-2xs inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3 h-3" /> View Transcript
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript Detail Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Call Transcript • {selectedCall.customerName || "Admissions Caller"}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Phone: {selectedCall.phoneNumber} • Duration: {formatDuration(selectedCall.durationSec)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Call Summary & Admissions Notes
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {selectedCall.notes ||
                    "Live call session between caller and Sonia (Senior Admissions Advisor). Handled questions about course qualifications, duration, fees, and installment structure with direct database accuracy."}
                </p>
              </div>

              {selectedCall.recordingUrl && (
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs">
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    <span>Call Recording Audio</span>
                  </div>
                  <audio controls src={selectedCall.recordingUrl} className="h-8 w-64 rounded-lg" />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Timestamp: {new Date(selectedCall.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
              >
                Close Transcript
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
