"use client";

import React, { useState, useEffect } from "react";
import {
  PhoneOutgoing,
  Search,
  Filter,
  FileText,
  Volume2,
  Download,
  Calendar,
  Clock,
  UserCheck,
  RefreshCw,
  X,
  Play,
  Pause,
  CheckCircle2,
  Flame,
  AlertCircle,
  Sparkles,
  PhoneForwarded,
  ArrowRight,
  TrendingUp,
  Tag,
  MessageSquare,
  Edit3,
  Save,
  Users,
  ShieldCheck,
  Award
} from "lucide-react";

export interface OutboundCallRecord {
  id: string;
  phoneNumber: string;
  customerName: string;
  courseInquired: string;
  status: string;
  disposition: "ENROLLED" | "CALLBACK_SCHEDULED" | "TRANSFERRED" | "NOT_INTERESTED" | "BUSY" | "NO_ANSWER" | string;
  leadScore: number;
  durationSec: number;
  transferredTo?: string | null;
  assignedToMember?: string | null;
  transferSummary?: string | null;
  transferStatus?: string | null;
  humanDisposition?: string | null;
  humanNotes?: string | null;
  scheduledCallback?: string | null;
  recordingUrl?: string | null;
  summary: string;
  transcript?: string | null;
  createdAt: string;
}

const DEFAULT_TEAM = [
  { name: "Sarah Jenkins", extension: "101", role: "Senior Admissions Specialist", avatar: "emerald" },
  { name: "Hamza Ali", extension: "102", role: "Scholarships & Course Advisor", avatar: "blue" },
  { name: "Ayesha Khan", extension: "103", role: "Student Enrollment Officer", avatar: "purple" },
  { name: "Zayn Malik", extension: "104", role: "Qualifications Consultant", avatar: "amber" },
  { name: "David Miller", extension: "105", role: "Executive Academic Counselor", avatar: "rose" },
];

const DEFAULT_OUTBOUND_CALLS: OutboundCallRecord[] = [
  {
    id: "out-101",
    customerName: "Amina Begum",
    phoneNumber: "+44 7722 119988",
    courseInquired: "Qualifi Level 4 Diploma in Cyber Security",
    status: "ANSWERED",
    disposition: "TRANSFERRED",
    assignedToMember: "Sarah Jenkins",
    transferredTo: "Sarah Jenkins (Ext 101)",
    humanDisposition: "ENROLLED",
    humanNotes: "Spoke with Amina after Sonia's transfer. Confirmed £128 initial deposit on monthly installment plan. Invoice and student portal login sent.",
    leadScore: 95,
    durationSec: 194,
    recordingUrl: null,
    summary:
      "Amina answered during UK business hours regarding her Level 4 Cyber Security inquiry. Sonia pitched Ofqual accreditation, 100% online coursework, and £128 deposit plan. Amina agreed to proceed and requested advisor verification. Sonia successfully transferred live to Sarah Jenkins on Ext 101.",
    transcript:
      "Sonia: Good afternoon! Am I speaking with Amina Begum?\nAmina: Yes, this is Amina.\nSonia: Wonderful! This is Sonia from Inspire London College regarding your inquiry for the Level 4 Cyber Security qualification. Do you have a quick 2 minutes to speak?\nAmina: Yes, I do.\nSonia: Fantastic! It's fully Ofqual-accredited, 100% online self-paced, with 1-on-1 tutor support and monthly installments starting from £128 deposit. Shall we lock in your discounted enrollment today?\nAmina: Yes, let's do it! Can I finalize this with an advisor?\nSonia: Absolutely! Connecting you right now to Sarah Jenkins on Ext 101...",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "out-102",
    customerName: "Johnathan Miller",
    phoneNumber: "+44 7911 123456",
    courseInquired: "Qualifi Level 5 Diploma in Education and Training (DET)",
    status: "ANSWERED",
    disposition: "TRANSFERRED",
    assignedToMember: "Hamza Ali",
    transferredTo: "Hamza Ali (Ext 102)",
    humanDisposition: "PAYMENT_PENDING",
    humanNotes: "Reviewed prior Level 3 teaching credits. Provided 25% discount voucher. Student promises to pay £150 deposit by tomorrow morning.",
    leadScore: 92,
    durationSec: 185,
    recordingUrl: null,
    summary:
      "Johnathan confirmed inquiry for Level 5 DET to teach in higher education. Sonia outlined course modules, tutor guidance, and £60/month payments. Caller requested placement verification, and Sonia transferred to Hamza Ali.",
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "out-103",
    customerName: "Amna Tariq",
    phoneNumber: "+44 7822 654321",
    courseInquired: "OTHM Level 7 Diploma in Strategic Marketing",
    status: "ANSWERED",
    disposition: "CALLBACK_SCHEDULED",
    assignedToMember: "Ayesha Khan",
    scheduledCallback: "Tomorrow at 3:00 PM UK Time",
    humanDisposition: "FOLLOW_UP_SCHEDULED",
    humanNotes: "Client was in office meeting. Callback booked for 3 PM tomorrow. Syllabus brochure sent via email.",
    leadScore: 78,
    durationSec: 85,
    recordingUrl: null,
    summary:
      "Amna answered during UK business hours. She was in an office client meeting but confirmed strong interest in the OTHM Level 7 Marketing Diploma. Sonia scheduled a confirmed callback slot for tomorrow at 3:00 PM.",
    createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
  },
  {
    id: "out-104",
    customerName: "Michael Davies",
    phoneNumber: "+44 7700 900123",
    courseInquired: "Focus Awards Level 3 Award in Education and Training (AET)",
    status: "ANSWERED",
    disposition: "ENROLLED",
    assignedToMember: "Sarah Jenkins",
    humanDisposition: "ENROLLED",
    humanNotes: "Fast-track enrollment confirmed. Receipt #8820 issued for £128 deposit.",
    leadScore: 98,
    durationSec: 242,
    recordingUrl: null,
    summary:
      "Michael confirmed he wants to become an NVQ trainer. Sonia detailed the Focus Awards Level 3 AET entry requirements, microteaching guidelines, £128 initial deposit, and verified digital certificate. Michael confirmed enrollment readiness.",
    createdAt: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
  },
  {
    id: "out-105",
    customerName: "Robert Chen",
    phoneNumber: "+44 7450 112233",
    courseInquired: "Level 3 Health & Social Care",
    status: "ANSWERED",
    disposition: "NOT_INTERESTED",
    assignedToMember: null,
    humanDisposition: "LOST",
    humanNotes: "Lead employer funded certificate already. Marked cold.",
    leadScore: 20,
    durationSec: 42,
    recordingUrl: null,
    summary:
      "Robert clarified that his employer funded his certificate last week. Sonia politely acknowledged and marked the lead cold to prevent further calls.",
    createdAt: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
  },
];

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return "00:00";
  const mins = Math.floor(sec / 60);
  const remainingSecs = Math.floor(sec % 60);
  return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
}

export default function OutboundCallsView() {
  const [calls, setCalls] = useState<OutboundCallRecord[]>(DEFAULT_OUTBOUND_CALLS);
  const [search, setSearch] = useState("");
  const [dispositionFilter, setDispositionFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [activeAdvisor, setActiveAdvisor] = useState("Sarah Jenkins"); // Current active logged-in advisor
  const [selectedCall, setSelectedCall] = useState<OutboundCallRecord | null>(null);
  const [editingCall, setEditingCall] = useState<OutboundCallRecord | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editDisposition, setEditDisposition] = useState("ENROLLED");
  const [editCallbackTime, setEditCallbackTime] = useState("");
  const [notesHistory, setNotesHistory] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadOutboundCalls = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calls/outbound");
      if (res.ok) {
        const data = await res.json();
        if (data.calls && data.calls.length > 0) {
          setCalls(data.calls);
        }
      }
    } catch (err) {
      console.log("Using cached demo calls:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOutboundCalls();
  }, []);

  const openEditModal = async (call: OutboundCallRecord) => {
    setEditingCall(call);
    setEditNotes("");
    setEditDisposition(call.humanDisposition || "ENROLLED");
    setEditCallbackTime("");
    setLoadingNotes(true);
    try {
      const res = await fetch(`/api/leads/notes?phoneNumber=${encodeURIComponent(call.phoneNumber)}`);
      if (res.ok) {
        const data = await res.json();
        setNotesHistory(data.notes || []);
      } else {
        setNotesHistory([]);
      }
    } catch {
      setNotesHistory([]);
    } finally {
      setLoadingNotes(false);
    }
  };

  const saveHumanDisposition = async () => {
    if (!editingCall) return;
    if (!editNotes.trim()) {
      showToast("Please enter notes for this call attempt before saving.");
      return;
    }

    try {
      const nextAttempt = notesHistory.length + 1;
      const res = await fetch("/api/leads/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: editingCall.id,
          phoneNumber: editingCall.phoneNumber,
          customerName: editingCall.customerName,
          attemptNumber: nextAttempt,
          advisorName: activeAdvisor,
          disposition: editDisposition,
          commentText: editNotes,
          callbackTime: editCallbackTime || null,
        }),
      });

      const data = await res.json();
      const updatedLog = data.formattedLog || `[Call #${nextAttempt} • ${activeAdvisor}]: ${editNotes}`;

      // Update local state
      setCalls((prev) =>
        prev.map((c) =>
          c.id === editingCall.id
            ? {
                ...c,
                assignedToMember: activeAdvisor,
                humanDisposition: editDisposition,
                humanNotes: updatedLog,
              }
            : c
        )
      );

      showToast(`Call #${nextAttempt} comment logged for ${editingCall.customerName}!`);
      setEditingCall(null);
    } catch (err) {
      console.error("Save error:", err);
      showToast("Error saving call note. Please try again.");
    }
  };

  const filteredCalls = calls.filter((c) => {
    const matchesSearch =
      (c.phoneNumber && c.phoneNumber.toLowerCase().includes(search.toLowerCase())) ||
      (c.customerName && c.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (c.courseInquired && c.courseInquired.toLowerCase().includes(search.toLowerCase())) ||
      (c.summary && c.summary.toLowerCase().includes(search.toLowerCase())) ||
      (c.assignedToMember && c.assignedToMember.toLowerCase().includes(search.toLowerCase()));

    const matchesDisposition =
      dispositionFilter === "all" ||
      c.disposition.toLowerCase() === dispositionFilter.toLowerCase();

    const matchesMember =
      memberFilter === "all" ||
      (c.assignedToMember && c.assignedToMember.toLowerCase() === memberFilter.toLowerCase());

    return matchesSearch && matchesDisposition && matchesMember;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header & Active Member Profile Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
              <PhoneOutgoing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                Outbound Calls Intelligence & Human Team Hand-Off
              </h2>
              <p className="text-xs text-slate-500">
                Sonia AI outbound calls, live transfers to 5 admissions advisors, and post-call comments.
              </p>
            </div>
          </div>
        </div>

        {/* Current Active Advisor Switcher (Team Profile) */}
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Active Human Advisor
              </span>
              <select
                value={activeAdvisor}
                onChange={(e) => {
                  setActiveAdvisor(e.target.value);
                  showToast(`Switched active profile to ${e.target.value}`);
                }}
                className="text-xs font-bold text-slate-800 bg-transparent border-none outline-none cursor-pointer pr-4"
              >
                {DEFAULT_TEAM.map((tm) => (
                  <option key={tm.name} value={tm.name}>
                    {tm.name} (Ext {tm.extension} • {tm.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Member Team Presence & Hand-Off Live Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {DEFAULT_TEAM.map((tm) => {
          const isSelected = activeAdvisor === tm.name;
          const assignedCount = calls.filter((c) => c.assignedToMember === tm.name).length;
          return (
            <div
              key={tm.name}
              onClick={() => {
                setActiveAdvisor(tm.name);
                showToast(`Viewing as ${tm.name}`);
              }}
              className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                  : "bg-white text-slate-800 border-slate-100 hover:border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                }`}>
                  Ext {tm.extension} • Available
                </span>
                <span className={`text-[10px] font-mono font-bold ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                  {assignedCount} calls
                </span>
              </div>
              <h4 className="font-bold text-xs truncate">{tm.name}</h4>
              <p className={`text-[10px] truncate ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                {tm.role}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student, course, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Member Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">All Advisors (5)</option>
              {DEFAULT_TEAM.map((tm) => (
                <option key={tm.name} value={tm.name}>
                  {tm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Disposition Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={dispositionFilter}
              onChange={(e) => setDispositionFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">All Dispositions</option>
              <option value="transferred">Transferred to Team</option>
              <option value="enrolled">Enrolled / Deposit</option>
              <option value="callback_scheduled">Callback Scheduled</option>
              <option value="not_interested">Not Interested</option>
            </select>
          </div>

          <button
            onClick={loadOutboundCalls}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition"
            title="Refresh Calls"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Outbound Calls Table with Requested Columns */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Lead Name & Contact</th>
                <th className="py-3 px-4">Target Course</th>
                <th className="py-3 px-4">AI Priority & Score</th>
                <th className="py-3 px-4">Call Disposition</th>
                <th className="py-3 px-4">AI Conversation Summary</th>
                <th className="py-3 px-4">Handled By & Outcome</th>
                <th className="py-3 px-4">Human Notes / Comments</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No outbound calls match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50/70 transition group">
                    {/* 1. Lead Name & Contact */}
                    <td className="py-3.5 px-4 min-w-[150px]">
                      <div className="font-semibold text-slate-800">{call.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{call.phoneNumber}</div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(call.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
                        {formatDuration(call.durationSec)}
                      </span>
                    </td>

                    {/* 2. Target Course */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <span className="text-[11px] font-medium text-slate-800 block line-clamp-2" title={call.courseInquired}>
                        {call.courseInquired}
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold">Inspire London College</span>
                    </td>

                    {/* 3. AI Priority & Score */}
                    <td className="py-3.5 px-4 min-w-[110px]">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          call.leadScore >= 85
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : call.leadScore >= 60
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {call.leadScore >= 85 ? <Flame className="w-2.5 h-2.5 text-rose-500" /> : null}
                        {call.leadScore}% {call.leadScore >= 85 ? "HOT" : call.leadScore >= 60 ? "WARM" : "COLD"}
                      </span>
                    </td>

                    {/* 4. Call Disposition */}
                    <td className="py-3.5 px-4 min-w-[130px]">
                      {call.disposition === "TRANSFERRED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <PhoneForwarded className="w-2.5 h-2.5" /> Transferred
                        </span>
                      )}
                      {call.disposition === "CALLBACK_SCHEDULED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-2.5 h-2.5" /> Callback
                        </span>
                      )}
                      {call.disposition === "ENROLLED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Enrolled
                        </span>
                      )}
                      {call.disposition === "NOT_INTERESTED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          Not Interested
                        </span>
                      )}
                    </td>

                    {/* 5. AI Conversation Summary */}
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed" title={call.summary}>
                        {call.summary}
                      </p>
                    </td>

                    {/* 6. Handled By (Team Member) & Outcome */}
                    <td className="py-3.5 px-4 min-w-[140px]">
                      {call.assignedToMember ? (
                        <div>
                          <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            {call.assignedToMember}
                          </div>
                          <span className={`inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            call.humanDisposition === "ENROLLED"
                              ? "bg-emerald-100 text-emerald-800"
                              : call.humanDisposition === "PAYMENT_PENDING"
                              ? "bg-blue-100 text-blue-800"
                              : call.humanDisposition === "FOLLOW_UP_SCHEDULED"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {call.humanDisposition || "Awaiting Outcome"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Sonia Automated AI</span>
                      )}
                    </td>

                    {/* 7. Human Notes / Comments */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      {call.humanNotes ? (
                        <p className="text-[11px] text-slate-700 italic line-clamp-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100" title={call.humanNotes}>
                          "{call.humanNotes}"
                        </p>
                      ) : (
                        <span className="text-[10px] text-slate-300">No human comments yet</span>
                      )}
                    </td>

                    {/* 8. Action Buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(call)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-xl font-bold text-[10px] transition inline-flex items-center gap-1"
                          title="Add / Edit Post-Call Notes"
                        >
                          <Edit3 className="w-3 h-3" /> Update
                        </button>
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-xl font-bold text-[10px] transition inline-flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Attempt Call History & Comment Thread Modal */}
      {editingCall && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                  <Edit3 className="w-5 h-5 text-emerald-100" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    Call History & Note Thread
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                      Call #{notesHistory.length + 1} Pending
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Student: <span className="font-semibold text-slate-800">{editingCall.customerName}</span> •{" "}
                    <span className="font-mono">{editingCall.phoneNumber}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCall(null)}
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
                  Past Calls & Advisor Notes Thread
                </span>

                {loadingNotes ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading call notes history...</div>
                ) : notesHistory.length === 0 ? (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-500">
                    No previous advisor comments recorded yet. You are logging <strong>Call #1</strong> below.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    {notesHistory.map((n, idx) => (
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
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            n.disposition === "ENROLLED"
                              ? "bg-emerald-100 text-emerald-800"
                              : n.disposition === "PAYMENT_PENDING"
                              ? "bg-blue-100 text-blue-800"
                              : n.disposition === "CALLBACK_SCHEDULED"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-200 text-slate-700"
                          }`}>
                            {n.disposition}
                          </span>
                          {n.callbackTime && (
                            <span className="text-[10px] text-amber-700 font-medium">
                              Callback: {new Date(n.callbackTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form: Add Note for Current / Next Call */}
              <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Log Notes for Call #{notesHistory.length + 1} ({activeAdvisor})
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                    Active Hand-Off
                  </span>
                </div>

                {/* Outcome Dropdown */}
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Call #{notesHistory.length + 1} Student Outcome / Disposition
                  </label>
                  <select
                    value={editDisposition}
                    onChange={(e) => setEditDisposition(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ENROLLED">🟢 Enrolled & Deposit Paid</option>
                    <option value="PAYMENT_PENDING">🔵 Payment / Invoice Pending</option>
                    <option value="FOLLOW_UP_SCHEDULED">🟡 Callback Rescheduled</option>
                    <option value="NO_ANSWER">⚪ No Answer / Voicemail</option>
                    <option value="LOST">🔴 Not Interested / Lost</option>
                  </select>
                </div>

                {/* Optional Callback Reschedule Picker */}
                {editDisposition === "FOLLOW_UP_SCHEDULED" && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Rescheduled Callback Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editCallbackTime}
                      onChange={(e) => setEditCallbackTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {/* Comment Textarea */}
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Conversation Notes for Call #{notesHistory.length + 1}
                  </label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={`E.g. Spoke with ${editingCall.customerName} on Call #${notesHistory.length + 1}. Agreed to installment plan...`}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setEditingCall(null)}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={saveHumanDisposition}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save Call #{notesHistory.length + 1} Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed AI Call Summary Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 to-purple-50/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
                  <Sparkles className="w-5 h-5 text-indigo-100" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    Outbound Call Summary • {selectedCall.customerName}
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        selectedCall.leadScore >= 85
                          ? "bg-rose-100 text-rose-700"
                          : selectedCall.leadScore >= 60
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {selectedCall.leadScore}% Match
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedCall.phoneNumber} • Duration: {formatDuration(selectedCall.durationSec)}
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
              {/* Course & Outcome Highlights */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Inquired Course
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedCall.courseInquired}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Handled By Team Member
                  </span>
                  <p className="text-xs font-bold text-indigo-700 mt-0.5 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedCall.assignedToMember || selectedCall.transferredTo || "Sonia Automated AI"}
                  </p>
                </div>
              </div>

              {/* Written AI Call Summary Box */}
              <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-white rounded-2xl border border-indigo-100 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>AI Written Call Summary & Key Takeaways</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">{selectedCall.summary}</p>
              </div>

              {/* Human Advisor Comments Box if present */}
              {selectedCall.humanNotes && (
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Admissions Advisor Comments ({selectedCall.assignedToMember})</span>
                  </div>
                  <p className="text-xs text-slate-800 italic leading-relaxed">"{selectedCall.humanNotes}"</p>
                </div>
              )}

              {/* Audio Playback */}
              {selectedCall.recordingUrl && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-100 block">Call Audio Recording</span>
                      <span className="text-[10px] text-slate-400">High-fidelity stereo call capture</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <audio controls preload="metadata" src={selectedCall.recordingUrl} className="h-8 rounded-lg flex-1 sm:w-52" />
                    <a
                      href={selectedCall.recordingUrl}
                      download={`outbound-${selectedCall.customerName}.ogg`}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs flex items-center gap-1 font-semibold border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Verbatim Transcript */}
              {selectedCall.transcript && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Verbatim Call Transcript
                    </span>
                    <span className="text-[10px] text-slate-400">Speaker Diarization Active</span>
                  </div>
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono space-y-2 max-h-56 overflow-y-auto leading-relaxed border border-slate-800">
                    {selectedCall.transcript.split("\n").map((line, idx) => {
                      const isSonia = line.startsWith("Sonia:");
                      return (
                        <div key={idx} className={isSonia ? "text-indigo-300" : "text-emerald-300"}>
                          <span className="font-bold">{line.split(":")[0]}:</span>
                          <span className="text-slate-200">{line.substring(line.indexOf(":") + 1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedCall(null);
                  openEditModal(selectedCall);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" /> Add Advisor Comments
              </button>
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
