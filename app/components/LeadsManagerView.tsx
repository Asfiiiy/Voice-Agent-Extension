"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Users,
  Search,
  Plus,
  Calendar,
  Clock,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  MessageCircle,
  CreditCard,
  Copy,
  Globe,
  Sparkles,
  Activity,
  Archive,
  RefreshCw,
  Download,
  Filter,
  UserCheck,
  ChevronDown,
  Edit3,
  Trash2,
  Eye,
  Send,
  Check,
  Flame,
  ArrowUpDown,
  FileText,
} from "lucide-react";

export type BusinessStatus =
  | "ALL"
  | "LATE_CALL"
  | "SCHEDULED_CALL"
  | "RECEIVED_CALL"
  | "NOT_RECEIVED_CALL"
  | "NEW"
  | "IN_PROGRESS"
  | "CONVERTED"
  | "NOT_CONVERTED"
  | "CLOSED_NO_RESPONSE"
  | "MAX_ATTEMPTS_REACHED"
  | "EMAIL_SHARED"
  | "WHATSAPP_SHARED"
  | "INTERNATIONAL_CALLS"
  | "PAYMENT_LINK_SHARED"
  | "DUPLICATE_LEAD"
  | "ALREADY_CONVERTED";

export interface LeadItem {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string | null;
  course?: string | null;
  status: string;
  leadScore: number;
  assignedToMember?: string | null;
  attemptsCount: number;
  maxAttempts: number;
  scheduledCallback?: string | null;
  lastAttemptAt?: string | null;
  humanNotes?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StatusTabConfig {
  key: BusinessStatus;
  label: string;
  color: string;
  activeBg: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_TABS: StatusTabConfig[] = [
  {
    key: "ALL",
    label: "All",
    color: "text-slate-700",
    activeBg: "bg-slate-900 text-white",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    icon: Users,
  },
  {
    key: "LATE_CALL",
    label: "Late Calls",
    color: "text-rose-600",
    activeBg: "bg-rose-600 text-white",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    icon: Flame,
  },
  {
    key: "SCHEDULED_CALL",
    label: "Scheduled Calls",
    color: "text-amber-600",
    activeBg: "bg-amber-600 text-white",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    icon: Calendar,
  },
  {
    key: "RECEIVED_CALL",
    label: "Received Call",
    color: "text-emerald-600",
    activeBg: "bg-emerald-600 text-white",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    icon: PhoneIncoming,
  },
  {
    key: "NOT_RECEIVED_CALL",
    label: "Not Received Call",
    color: "text-slate-500",
    activeBg: "bg-slate-600 text-white",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-600",
    icon: PhoneOff,
  },
  {
    key: "NEW",
    label: "New",
    color: "text-blue-600",
    activeBg: "bg-blue-600 text-white",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    icon: Sparkles,
  },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    color: "text-indigo-600",
    activeBg: "bg-indigo-600 text-white",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-700",
    icon: Activity,
  },
  {
    key: "CONVERTED",
    label: "Converted",
    color: "text-green-600",
    activeBg: "bg-green-600 text-white",
    badgeBg: "bg-green-50",
    badgeText: "text-green-700",
    icon: CheckCircle2,
  },
  {
    key: "NOT_CONVERTED",
    label: "Not Converted",
    color: "text-zinc-600",
    activeBg: "bg-zinc-700 text-white",
    badgeBg: "bg-zinc-100",
    badgeText: "text-zinc-700",
    icon: XCircle,
  },
  {
    key: "CLOSED_NO_RESPONSE",
    label: "Closed No Response",
    color: "text-slate-400",
    activeBg: "bg-slate-700 text-white",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-600",
    icon: Archive,
  },
  {
    key: "MAX_ATTEMPTS_REACHED",
    label: "Max Attempts Reached",
    color: "text-red-700",
    activeBg: "bg-red-700 text-white",
    badgeBg: "bg-red-50",
    badgeText: "text-red-700",
    icon: AlertTriangle,
  },
  {
    key: "EMAIL_SHARED",
    label: "Email Shared",
    color: "text-sky-600",
    activeBg: "bg-sky-600 text-white",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-700",
    icon: Mail,
  },
  {
    key: "WHATSAPP_SHARED",
    label: "WhatsApp Shared",
    color: "text-teal-600",
    activeBg: "bg-teal-600 text-white",
    badgeBg: "bg-teal-50",
    badgeText: "text-teal-700",
    icon: MessageCircle,
  },
  {
    key: "INTERNATIONAL_CALLS",
    label: "International Calls",
    color: "text-purple-600",
    activeBg: "bg-purple-600 text-white",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    icon: Globe,
  },
  {
    key: "PAYMENT_LINK_SHARED",
    label: "Payment Link Shared",
    color: "text-violet-600",
    activeBg: "bg-violet-600 text-white",
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-700",
    icon: CreditCard,
  },
  {
    key: "DUPLICATE_LEAD",
    label: "Duplicate Lead",
    color: "text-orange-600",
    activeBg: "bg-orange-600 text-white",
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-700",
    icon: Copy,
  },
  {
    key: "ALREADY_CONVERTED",
    label: "Already Converted",
    color: "text-emerald-700",
    activeBg: "bg-emerald-700 text-white",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    icon: UserCheck,
  },
];

const ADVISORS = [
  "Sarah Jenkins",
  "Hamza Ali",
  "Ayesha Khan",
  "Zayn Malik",
  "David Miller",
];

export default function LeadsManagerView({
  onDialLead,
}: {
  onDialLead?: (lead: { name: string; phone: string; course: string }) => void;
}) {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [selectedStatus, setSelectedStatus] = useState<BusinessStatus>("ALL");
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>("All assignees");
  const [searchQuery, setSearchQuery] = useState("");
  const [datePeriod, setDatePeriod] = useState<string>("Current Month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isArchiveView, setIsArchiveView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Lead Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadCourse, setNewLeadCourse] = useState("Qualifi Level 4 Diploma in Cyber Security");
  const [newLeadAssignee, setNewLeadAssignee] = useState("Sarah Jenkins");
  const [newLeadStatus, setNewLeadStatus] = useState<BusinessStatus>("NEW");
  const [newLeadNotes, setNewLeadNotes] = useState("");
  const [newLeadCallbackTime, setNewLeadCallbackTime] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Multi-Attempt Notes Modal State
  const [selectedLeadForNotes, setSelectedLeadForNotes] = useState<LeadItem | null>(null);
  const [leadNotesHistory, setLeadNotesHistory] = useState<any[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteDisposition, setNewNoteDisposition] = useState("FOLLOW_UP_SCHEDULED");
  const [newNoteCallbackTime, setNewNoteCallbackTime] = useState("");
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch leads from API
  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      let url = `/api/leads?`;
      if (selectedStatus !== "ALL") url += `status=${selectedStatus}&`;
      if (selectedAdvisor !== "All assignees") url += `assignedTo=${encodeURIComponent(selectedAdvisor)}&`;
      if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;
      if (fromDate) url += `from=${fromDate}&`;
      if (toDate) url += `to=${toDate}&`;
      if (isArchiveView) url += `archived=true&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
        if (data.statusCounts) {
          setStatusCounts(data.statusCounts);
        }
      }
    } catch (err) {
      console.error("Failed to load leads:", err);
      showToast("Error loading leads");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [selectedStatus, selectedAdvisor, fromDate, toDate, isArchiveView]);

  // Handle Search on Enter or debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle Date Period Presets
  const handlePeriodChange = (preset: string) => {
    setDatePeriod(preset);
    const now = new Date();
    if (preset === "Today") {
      const todayStr = now.toISOString().split("T")[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "Yesterday") {
      const y = new Date(now.getTime() - 86400000);
      const yStr = y.toISOString().split("T")[0];
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "Last 7 Days") {
      const past = new Date(now.getTime() - 86400000 * 7);
      setFromDate(past.toISOString().split("T")[0]);
      setToDate(now.toISOString().split("T")[0]);
    } else if (preset === "Current Month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setFromDate(firstDay);
      setToDate(now.toISOString().split("T")[0]);
    } else if (preset === "All Time") {
      setFromDate("");
      setToDate("");
    }
  };

  // Add Lead Submit
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadPhone.trim()) {
      showToast("Name and Phone Number are required.");
      return;
    }

    setIsSubmittingLead(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLeadName,
          phoneNumber: newLeadPhone,
          email: newLeadEmail || null,
          course: newLeadCourse,
          status: newLeadStatus,
          assignedToMember: newLeadAssignee,
          notes: newLeadNotes || null,
          scheduledCallback: newLeadCallbackTime || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Lead created successfully: ${newLeadName}`);
        setIsAddModalOpen(false);
        // Reset form
        setNewLeadName("");
        setNewLeadPhone("");
        setNewLeadEmail("");
        setNewLeadNotes("");
        setNewLeadCallbackTime("");
        fetchLeads();
      } else {
        showToast(data.error || "Failed to create lead");
      }
    } catch (err) {
      console.error("Create lead error:", err);
      showToast("Error creating lead");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Quick Change Lead Status from Dropdown in Table
  const handleUpdateStatus = async (leadId: string, newStatus: BusinessStatus) => {
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leadId,
          status: newStatus,
        }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
        showToast(`Status updated to ${newStatus.replace(/_/g, " ")}`);
        // Refresh counts
        fetchLeads();
      }
    } catch {
      showToast("Failed to update status");
    }
  };

  // Quick Change Assignee from Dropdown in Table
  const handleUpdateAssignee = async (leadId: string, newAssignee: string) => {
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leadId,
          assignedToMember: newAssignee,
        }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, assignedToMember: newAssignee } : l))
        );
        showToast(`Assigned to ${newAssignee}`);
      }
    } catch {
      showToast("Failed to assign lead");
    }
  };

  // Open Notes Modal for Chronological Timeline
  const openLeadNotesModal = async (lead: LeadItem) => {
    setSelectedLeadForNotes(lead);
    setNewNoteText("");
    setNewNoteDisposition(lead.status === "CONVERTED" ? "ENROLLED" : "FOLLOW_UP_SCHEDULED");
    setNewNoteCallbackTime("");
    setIsLoadingNotes(true);
    try {
      const res = await fetch(`/api/leads/notes?phoneNumber=${encodeURIComponent(lead.phoneNumber)}`);
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

  // Save Attempt Note
  const saveAttemptNote = async () => {
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
          phoneNumber: selectedLeadForNotes.phoneNumber,
          customerName: selectedLeadForNotes.name,
          attemptNumber: nextAttempt,
          advisorName: selectedLeadForNotes.assignedToMember || "Sarah Jenkins",
          disposition: newNoteDisposition,
          commentText: newNoteText,
          callbackTime: newNoteCallbackTime || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Call #${nextAttempt} note saved successfully!`);
        setSelectedLeadForNotes(null);
        fetchLeads();
      }
    } catch {
      showToast("Error saving call note");
    }
  };

  // Export filtered leads to CSV
  const exportToCsv = () => {
    if (leads.length === 0) {
      showToast("No leads to export");
      return;
    }

    const headers = [
      "Name",
      "Phone",
      "Email",
      "Course",
      "Status",
      "Assigned To",
      "Attempts",
      "Score",
      "Created Date",
      "Notes",
    ];

    const rows = leads.map((l) => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.phoneNumber}"`,
      `"${l.email || ""}"`,
      `"${(l.course || "").replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${l.assignedToMember || "Unassigned"}"`,
      l.attemptsCount,
      l.leadScore,
      `"${new Date(l.createdAt).toLocaleDateString()}"`,
      `"${(l.humanNotes || l.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Synchronized_Leads_${selectedStatus}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${leads.length} leads to CSV!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2.5 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Leads</h2>
              <p className="text-xs text-slate-500 font-medium">
                All synchronized leads across admissions campaigns, website inquiries, and shared lines.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsArchiveView(!isArchiveView)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              isArchiveView
                ? "bg-slate-800 text-white border-slate-700 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Archive className="w-4 h-4 text-slate-400" />
            {isArchiveView ? "Viewing Archive" : "Archive History"}
          </button>

          <button
            onClick={exportToCsv}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>

          <button
            onClick={fetchLeads}
            className="p-2.5 rounded-xl text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-2xs"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Date & Assignment Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Period Presets */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
            {["Current Month", "Today", "Yesterday", "Last 7 Days", "All Time"].map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  datePeriod === p
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Date Range: From / To */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold text-[11px]">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePeriod("Custom");
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
            <span className="text-slate-400 font-semibold text-[11px]">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePeriod("Custom");
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
        </div>

        {/* Assigned To Filter & Search */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Assigned To Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Assigned To:</span>
            <select
              value={selectedAdvisor}
              onChange={(e) => setSelectedAdvisor(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="All assignees">All assignees</option>
              {ADVISORS.map((adv) => (
                <option key={adv} value={adv}>
                  {adv}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search lead, phone, course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      {/* The 17 Interactive Status Filter Pills (Horizontally Scrollable) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedStatus === tab.key;
            const count = statusCounts[tab.key] ?? 0;

            return (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isSelected
                    ? tab.activeBg + " shadow-sm scale-102"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : tab.color}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tracking-tight ${
                    isSelected ? "bg-white/20 text-white" : `${tab.badgeBg} ${tab.badgeText}`
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-black">
                <th className="py-3.5 px-4">Lead Details</th>
                <th className="py-3.5 px-4">Target Course</th>
                <th className="py-3.5 px-4">Status & Pipeline</th>
                <th className="py-3.5 px-4">Assigned Advisor</th>
                <th className="py-3.5 px-4">Cadence & Timing</th>
                <th className="py-3.5 px-4">AI / Team Notes</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    <p className="font-bold text-xs">Loading synchronized leads...</p>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No leads found in this view</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No leads match the status filter <span className="font-bold text-indigo-600">"{selectedStatus.replace(/_/g, " ")}"</span>.
                    </p>
                    <button
                      onClick={() => setSelectedStatus("ALL")}
                      className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100"
                    >
                      View All Leads
                    </button>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const statusConfig = STATUS_TABS.find((t) => t.key === lead.status) || STATUS_TABS[0];
                  const StatusIcon = statusConfig.icon;
                  const isInternational = !lead.phoneNumber.startsWith("+44");

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-indigo-50/20 transition-colors group"
                    >
                      {/* Lead Details */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 text-xs">{lead.name}</span>
                              {isInternational && (
                                <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[9px] font-bold flex items-center gap-0.5">
                                  <Globe className="w-2.5 h-2.5" /> INTL
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-[11px] font-mono mt-0.5">
                              {lead.phoneNumber}
                            </div>
                            {lead.email && (
                              <div className="text-slate-400 text-[10px] truncate max-w-44">
                                {lead.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Course */}
                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-700 max-w-56 leading-snug">
                          {lead.course || "General Qualification"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Score: <span className="text-indigo-600 font-mono font-bold">{lead.leadScore}</span> / 100
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-4 px-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateStatus(lead.id, e.target.value as BusinessStatus)}
                          className={`text-[11px] font-bold rounded-xl px-2.5 py-1.5 outline-none border transition-all cursor-pointer ${statusConfig.badgeBg} ${statusConfig.badgeText} border-transparent hover:border-slate-300`}
                        >
                          {STATUS_TABS.filter((t) => t.key !== "ALL").map((t) => (
                            <option key={t.key} value={t.key}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Assigned Advisor */}
                      <td className="py-4 px-4">
                        <select
                          value={lead.assignedToMember || "Sarah Jenkins"}
                          onChange={(e) => handleUpdateAssignee(lead.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[11px] rounded-xl px-2.5 py-1.5 outline-none cursor-pointer hover:border-indigo-300"
                        >
                          {ADVISORS.map((adv) => (
                            <option key={adv} value={adv}>
                              {adv}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Cadence & Attempts */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700 text-xs">
                            {lead.attemptsCount} / {lead.maxAttempts}
                          </span>
                          <span className="text-[10px] text-slate-400">attempts</span>
                        </div>
                        {lead.scheduledCallback ? (
                          <div className="text-[10px] text-amber-700 font-bold flex items-center gap-1 mt-1 bg-amber-50 px-2 py-0.5 rounded-md inline-flex">
                            <Clock className="w-3 h-3" />
                            {new Date(lead.scheduledCallback).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-1">
                            {new Date(lead.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        )}
                      </td>

                      {/* Notes / Audit Log */}
                      <td className="py-4 px-4 max-w-64">
                        <div className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {lead.humanNotes || lead.notes || "No comments yet"}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Dial Button */}
                          <button
                            onClick={() => {
                              if (onDialLead) {
                                onDialLead({
                                  name: lead.name,
                                  phone: lead.phoneNumber,
                                  course: lead.course || "General Qualification",
                                });
                              }
                              showToast(`Dialing ${lead.name} with Sonia AI...`);
                            }}
                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-2xs"
                            title="Dial with Sonia AI"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </button>

                          {/* Notes History Modal */}
                          <button
                            onClick={() => openLeadNotesModal(lead)}
                            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-2xs"
                            title="Call Attempt Notes History"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp Share */}
                          <a
                            href={`https://wa.me/${lead.phoneNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                              `Hello ${lead.name}, this is Inspire London College regarding your inquiry for ${lead.course}. We currently have a 25% promotional discount available!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white rounded-xl transition-all shadow-2xs"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
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

      {/* ADD LEAD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Add New Lead</h3>
                  <p className="text-[11px] text-slate-400">Manual entry to synchronized lead pipeline</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amina Begum"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+44 7722 119988"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Qualification / Course</label>
                <input
                  type="text"
                  placeholder="e.g. Qualifi Level 4 Diploma in Cyber Security"
                  value={newLeadCourse}
                  onChange={(e) => setNewLeadCourse(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={newLeadStatus}
                    onChange={(e) => setNewLeadStatus(e.target.value as BusinessStatus)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    {STATUS_TABS.filter((t) => t.key !== "ALL").map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign to Advisor</label>
                  <select
                    value={newLeadAssignee}
                    onChange={(e) => setNewLeadAssignee(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    {ADVISORS.map((adv) => (
                      <option key={adv} value={adv}>
                        {adv}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Callback Due (Optional)</label>
                <input
                  type="datetime-local"
                  value={newLeadCallbackTime}
                  onChange={(e) => setNewLeadCallbackTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Inquiry Comments / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Website inquiry notes or reason for inquiry..."
                  value={newLeadNotes}
                  onChange={(e) => setNewLeadNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmittingLead ? "Saving Lead..." : "Save & Synchronize"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MULTI-ATTEMPT CALL NOTES MODAL */}
      {selectedLeadForNotes && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <span>📝 Call Attempt History & Notes</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedLeadForNotes.name} • {selectedLeadForNotes.phoneNumber} • {selectedLeadForNotes.course}
                </p>
              </div>
              <button
                onClick={() => setSelectedLeadForNotes(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Previous Attempts Timeline */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
                  Previous Calls Audit Trail ({leadNotesHistory.length} Recorded)
                </h4>
                {isLoadingNotes ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading call history...</div>
                ) : leadNotesHistory.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No individual call notes logged yet. Use the form below to record Call #1.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {leadNotesHistory.map((note) => (
                      <div
                        key={note.id}
                        className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[10px]">
                            Call #{note.attemptNumber} • {note.advisorName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(note.createdAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-xs">{note.commentText}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-bold text-slate-600">Outcome: {note.disposition}</span>
                          {note.callbackTime && (
                            <span className="text-amber-700 font-bold">
                              • Callback: {new Date(note.callbackTime).toLocaleString([], {
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

              {/* Form to log Call #{next} */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Log Notes for Call #{leadNotesHistory.length + 1}</span>
                  <span className="text-[10px] text-indigo-600 font-normal">
                    Advisor: {selectedLeadForNotes.assignedToMember || "Sarah Jenkins"}
                  </span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Call Disposition</label>
                    <select
                      value={newNoteDisposition}
                      onChange={(e) => setNewNoteDisposition(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="CALLBACK_SCHEDULED">Callback Rescheduled</option>
                      <option value="FOLLOW_UP_SCHEDULED">Interested - Follow Up</option>
                      <option value="ENROLLED">Enrolled & Deposit Paid</option>
                      <option value="PAYMENT_PENDING">Payment Link Sent</option>
                      <option value="NO_ANSWER">No Answer / Busy</option>
                      <option value="LOST">Not Interested / Lost</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Reschedule Callback (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={newNoteCallbackTime}
                      onChange={(e) => setNewNoteCallbackTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Call Comments / Customer Response
                  </label>
                  <textarea
                    rows={3}
                    placeholder="What did the customer say on this call? Any specific concerns or follow-up instructions..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedLeadForNotes(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={saveAttemptNote}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all"
              >
                Save Call #{leadNotesHistory.length + 1} Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
