"use client";

import React, { useState } from "react";
import {
  Users,
  UserCheck,
  PhoneCall,
  Clock,
  PhoneForwarded,
  ShieldCheck,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Radio,
  Coffee,
  Volume2,
  Sparkles,
  PhoneOff,
  Filter,
  Search,
  ArrowRightLeft
} from "lucide-react";
import StatusSelectorDropdown from "./StatusSelectorDropdown";

export interface SupportAgent {
  id: string;
  name: string;
  avatar: string;
  role: string;
  department: "Admissions" | "Billing & Finance" | "Technical Support" | "Course Advisory";
  extension: string;
  status: "available" | "on_call" | "away" | "offline" | "short_break" | "lunch";
  currentCall?: {
    callerName: string;
    phoneNumber: string;
    durationSec: number;
    inquiryTopic: string;
  };
  todayCallsHandled: number;
  avgHandlingTime: string;
  rating: string;
}

const initialAgents: SupportAgent[] = [
  {
    id: "AGT-101",
    name: "Sarah Jenkins",
    avatar: "SJ",
    role: "Senior Admissions Specialist",
    department: "Admissions",
    extension: "Ext 101",
    status: "available",
    todayCallsHandled: 19,
    avgHandlingTime: "3m 45s",
    rating: "4.9"
  },
  {
    id: "AGT-102",
    name: "Marcus Vance",
    avatar: "MV",
    role: "Cyber & IT Course Advisor",
    department: "Course Advisory",
    extension: "Ext 102",
    status: "on_call",
    currentCall: {
      callerName: "Atika Farooq",
      phoneNumber: "+44 7911 234890",
      durationSec: 184,
      inquiryTopic: "Qualifi Level 5 Cyber Security (30% Discount)"
    },
    todayCallsHandled: 14,
    avgHandlingTime: "4m 12s",
    rating: "4.8"
  },
  {
    id: "AGT-103",
    name: "Ayesha Malik",
    avatar: "AM",
    role: "Finance & Installments Officer",
    department: "Billing & Finance",
    extension: "Ext 103",
    status: "available",
    todayCallsHandled: 22,
    avgHandlingTime: "3m 10s",
    rating: "5.0"
  },
  {
    id: "AGT-104",
    name: "David Ross",
    avatar: "DR",
    role: "Health & Social Care Advisor",
    department: "Course Advisory",
    extension: "Ext 104",
    status: "on_call",
    currentCall: {
      callerName: "John Smith",
      phoneNumber: "+44 7822 998811",
      durationSec: 78,
      inquiryTopic: "Level 3 Health and Social Care £75 Deposit"
    },
    todayCallsHandled: 11,
    avgHandlingTime: "4m 50s",
    rating: "4.7"
  },
  {
    id: "AGT-105",
    name: "Zara Qureshi",
    avatar: "ZQ",
    role: "Student Onboarding Officer",
    department: "Admissions",
    extension: "Ext 105",
    status: "away",
    todayCallsHandled: 16,
    avgHandlingTime: "3m 30s",
    rating: "4.9"
  },
  {
    id: "AGT-106",
    name: "James Taylor",
    avatar: "JT",
    role: "Student Portal & IT Support",
    department: "Technical Support",
    extension: "Ext 106",
    status: "offline",
    todayCallsHandled: 8,
    avgHandlingTime: "2m 55s",
    rating: "4.6"
  }
];

export default function TeamPresenceView() {
  const [agents, setAgents] = useState<SupportAgent[]>(initialAgents);
  const [filterDept, setFilterDept] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const setAgentStatus = (id: string, newStatus: SupportAgent["status"]) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === id ? { ...agent, status: newStatus } : agent
      )
    );
    showToast(`Agent status updated to ${newStatus.replace("_", " ").toUpperCase()}`);
  };

  const filteredAgents = agents.filter((a) => {
    const matchesDept = filterDept === "all" || a.department === filterDept;
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.extension.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const availableCount = agents.filter((a) => a.status === "available").length;
  const onCallCount = agents.filter((a) => a.status === "on_call").length;
  const awayCount = agents.filter((a) => a.status === "away").length;
  const offlineCount = agents.filter((a) => a.status === "offline").length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Top Banner & Presence KPI Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                Human Workforce Cockpit
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Handoff Ready
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1.5">
              Customer Support Team Presence & Call Transfer Roster
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitor active staff status, current live calls, and transfer incoming callers from Sonia (AI) to human specialists with 1-click.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => showToast("Broadcasting warm ping to all available advisors")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Ready for Live AI Transfers
            </button>
          </div>
        </div>

        {/* Presence Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                Available (Free)
              </p>
              <p className="text-2xl font-bold text-emerald-950 mt-1">{availableCount} Agents</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Ready for instant call transfer</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
                Busy (On Call)
              </p>
              <p className="text-2xl font-bold text-rose-950 mt-1">{onCallCount} Agents</p>
              <p className="text-[10px] text-rose-600 mt-0.5">Speaking with customers</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                On Break / Away
              </p>
              <p className="text-2xl font-bold text-amber-950 mt-1">{awayCount} Agents</p>
              <p className="text-[10px] text-amber-600 mt-0.5">Short break or lunch</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Coffee className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Offline
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{offlineCount} Agents</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Shift ended</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600">
              <PhoneOff className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Department:
          </span>
          {["all", "Admissions", "Course Advisory", "Billing & Finance", "Technical Support"].map(
            (dept) => (
              <button
                key={dept}
                onClick={() => setFilterDept(dept)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  filterDept === dept
                    ? "bg-indigo-600 text-white shadow-xs font-semibold"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {dept === "all" ? "All Departments" : dept}
              </button>
            )
          )}
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search advisor or extension..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Team Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAgents.map((agent) => {
          const isAvailable = agent.status === "available";
          const isOnCall = agent.status === "on_call";
          const isAway = agent.status === "away";
          const isOffline = agent.status === "offline";

          return (
            <div
              key={agent.id}
              className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-xs flex flex-col justify-between ${
                isAvailable
                  ? "border-emerald-200 hover:border-emerald-300"
                  : isOnCall
                  ? "border-rose-200 hover:border-rose-300 bg-rose-50/20"
                  : isAway
                  ? "border-amber-200"
                  : "border-slate-200 opacity-75"
              }`}
            >
              <div>
                {/* Header: Avatar, Name, Extension & Live Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                          isAvailable
                            ? "bg-emerald-600 text-white"
                            : isOnCall
                            ? "bg-rose-600 text-white"
                            : isAway
                            ? "bg-amber-500 text-white"
                            : "bg-slate-400 text-white"
                        }`}
                      >
                        {agent.avatar}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          isAvailable
                            ? "bg-emerald-500"
                            : isOnCall
                            ? "bg-rose-500 animate-pulse"
                            : isAway
                            ? "bg-amber-400"
                            : "bg-slate-400"
                        }`}
                      />
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{agent.name}</h3>
                      <p className="text-[11px] text-slate-500">{agent.role}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono text-[10px] font-bold">
                        {agent.extension}
                      </span>
                    </div>
                  </div>

                  {/* Status Tag */}
                  <div>
                    {isAvailable && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Available
                      </span>
                    )}
                    {isOnCall && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        On Call
                      </span>
                    )}
                    {(isAway || agent.status === "short_break") && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        🟡 Break (10m)
                      </span>
                    )}
                    {agent.status === "lunch" && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        🍽️ Lunch
                      </span>
                    )}
                    {isOffline && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        Offline
                      </span>
                    )}
                  </div>
                </div>

                {/* Active Call Live Card if agent is on call */}
                {isOnCall && agent.currentCall && (
                  <div className="mt-4 p-3 bg-white border border-rose-200 rounded-xl shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] text-rose-700 font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <Radio className="w-3 h-3 text-rose-500 animate-pulse" /> Live Call Active
                      </span>
                      <span className="font-mono text-slate-700 bg-rose-50 px-1.5 py-0.5 rounded">
                        {Math.floor(agent.currentCall.durationSec / 60)}:
                        {(agent.currentCall.durationSec % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {agent.currentCall.callerName} ({agent.currentCall.phoneNumber})
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {agent.currentCall.inquiryTopic}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() =>
                          showToast(`Listening in to ${agent.name}'s call silently`)
                        }
                        className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700 flex items-center justify-center gap-1 transition"
                      >
                        <Headphones className="w-3 h-3 text-slate-600" /> Listen In
                      </button>
                      <button
                        onClick={() =>
                          showToast(`Supervisor whispered instruction to ${agent.name}`)
                        }
                        className="flex-1 py-1 px-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-[10px] font-bold text-indigo-700 flex items-center justify-center gap-1 transition"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-600" /> Whisper
                      </button>
                    </div>
                  </div>
                )}

                {/* Agent Daily KPIs */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-slate-600">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <p className="text-[10px] text-slate-400 font-medium">Calls Today</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{agent.todayCallsHandled}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <p className="text-[10px] text-slate-400 font-medium">Avg Handling</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{agent.avgHandlingTime}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <p className="text-[10px] text-slate-400 font-medium">Rating</p>
                    <p className="text-xs font-bold text-amber-600 mt-0.5">★ {agent.rating}</p>
                  </div>
                </div>
              </div>

              {/* Status Toggles & Transfer Action */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <StatusSelectorDropdown
                    memberId={agent.id}
                    memberName={agent.name}
                    initialStatus={
                      agent.status === "available"
                        ? "AVAILABLE"
                        : agent.status === "short_break"
                        ? "SHORT_BREAK"
                        : agent.status === "lunch"
                        ? "LUNCH"
                        : agent.status === "on_call"
                        ? "ON_CALL"
                        : "OFFLINE"
                    }
                    onStatusChange={(newStatus) => {
                      const mapped = newStatus.toLowerCase() as SupportAgent["status"];
                      setAgentStatus(agent.id, mapped);
                    }}
                    compact={true}
                  />
                </div>

                {isAvailable && (
                  <button
                    onClick={() =>
                      showToast(`Transferred active LiveKit call to ${agent.name} (${agent.extension})`)
                    }
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition active:scale-95"
                  >
                    <PhoneForwarded className="w-3.5 h-3.5" /> Transfer Call
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
