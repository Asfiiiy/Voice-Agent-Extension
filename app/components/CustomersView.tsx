"use client";

import React, { useState } from "react";
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  GraduationCap,
  Sparkles,
  Check,
  Send,
  UserCheck
} from "lucide-react";

interface StudentLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  course: string;
  status: "Hot Lead" | "Enrolled" | "Inquiry" | "Follow-up";
  source: string;
  date: string;
  feeQuoted: string;
  notes: string;
}

const initialLeads: StudentLead[] = [
  {
    id: "STU-117070",
    name: "Happy Okoromu",
    phone: "+44 7911 123456",
    email: "happy.o@example.co.uk",
    course: "Instalment Payment Link • Phlebotomy",
    status: "Enrolled",
    source: "Inbound AI Call (Sonia)",
    date: "Today, 11:20 AM",
    feeQuoted: "£80.00",
    notes: "Order verified via WooCommerce REST API. Active student."
  },
  {
    id: "STU-117071",
    name: "Ahmed Khan",
    phone: "+44 7822 654321",
    email: "ahmed.k92@gmail.com",
    course: "Level 3 Certificate in Phlebotomy (Part 1)",
    status: "Hot Lead",
    source: "Inbound AI Call (Sonia)",
    date: "Today, 10:45 AM",
    feeQuoted: "£80.00 (Sale)",
    notes: "Asked for 22 Aug London classroom date. Very keen to register."
  },
  {
    id: "STU-117072",
    name: "Sarah Jenkins",
    phone: "+44 7700 900143",
    email: "sarah.jenkins@outlook.com",
    course: "Qualifi Level 5 Health and Social Care",
    status: "Follow-up",
    source: "Inbound AI Call (Sonia)",
    date: "Yesterday",
    feeQuoted: "£650.00",
    notes: "Requested installment plan details and university progression info."
  },
  {
    id: "STU-117073",
    name: "Fatima Al-Zahra",
    phone: "+44 7411 889900",
    email: "fatima.z@hotmail.com",
    course: "Part 2 – Advanced Practical Blood Session",
    status: "Hot Lead",
    source: "Inbound AI Call (Sonia)",
    date: "Yesterday",
    feeQuoted: "£270.00",
    notes: "Completed Part 1. Wants London slot for September."
  },
  {
    id: "STU-117074",
    name: "David O'Connor",
    phone: "+44 7555 432198",
    email: "doconnor@btinternet.com",
    course: "ATHE Level 4 Diploma in Business Management",
    status: "Inquiry",
    source: "Website Webhook",
    date: "2 days ago",
    feeQuoted: "£420.00",
    notes: "Inquired about degree top-up with UK universities."
  }
];

export default function CustomersView() {
  const [leads, setLeads] = useState<StudentLead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New lead form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCourse, setNewCourse] = useState("Level 3 Certificate in Phlebotomy");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const newLead: StudentLead = {
      id: `STU-${Math.floor(100000 + Math.random() * 900000)}`,
      name: newName,
      phone: newPhone,
      email: `${newName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      course: newCourse,
      status: "Hot Lead",
      source: "Manual Entry (Dashboard)",
      date: "Just now",
      feeQuoted: "£80.00",
      notes: "Prospective student captured from admissions desk."
    };

    setLeads([newLead, ...leads]);
    setNewName("");
    setNewPhone("");
    setShowAddModal(false);
    showToast(`Lead for ${newLead.name} created successfully!`);
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.course.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = selectedFilter === "All" || l.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" /> {toastMessage}
        </div>
      )}

      {/* CRM Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Enquiries</span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">{leads.length + 120}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">↑ +18% this week</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hot Leads (High Intent)</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">
            {leads.filter((l) => l.status === "Hot Lead").length + 24}
          </p>
          <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Ready to enroll</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Confirmed Enrolled</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">84</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">WooCommerce verified</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Follow-ups</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">12</p>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Callback requested</p>
        </div>
      </div>

      {/* Leads Controls & Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, phone, or course..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Filters & Add Button */}
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {["All", "Hot Lead", "Enrolled", "Follow-up", "Inquiry"].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedFilter === f
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Student Lead
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">Course of Interest</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Inquiry Source</th>
                <th className="py-3 px-3">Fee Quoted</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                        {lead.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p>{lead.name}</p>
                        <p className="text-[10px] text-slate-400 font-normal">{lead.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-medium text-slate-700">{lead.course}</p>
                    <p className="text-[10px] text-slate-400">{lead.notes}</p>
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-mono text-slate-700">{lead.phone}</p>
                    <p className="text-[10px] text-slate-400">{lead.email}</p>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        lead.status === "Enrolled"
                          ? "bg-indigo-100 text-indigo-700"
                          : lead.status === "Hot Lead"
                          ? "bg-rose-100 text-rose-700"
                          : lead.status === "Follow-up"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">
                    <p>{lead.source}</p>
                    <p className="text-[10px] text-slate-400">{lead.date}</p>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-emerald-600">
                    {lead.feeQuoted}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => showToast(`Initiating outbound MicroSIP call to ${lead.phone}...`)}
                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        title="Call Student via MicroSIP"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => showToast(`Admission Link & Brochure dispatched to WhatsApp (${lead.phone})!`)}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        title="Send WhatsApp Admission Link"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900">Add New Student Lead</h3>
            <p className="text-xs text-slate-500">
              Register a prospective student inquiry for admissions follow-up.
            </p>

            <form onSubmit={handleAddLead} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Maria Gonzalez"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+44 7..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course of Interest</label>
                <select
                  value={newCourse}
                  onChange={(e) => setNewCourse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Level 3 Certificate in Phlebotomy (Part 1)">Level 3 Certificate in Phlebotomy (Part 1)</option>
                  <option value="Part 2 – Advanced Practical Live Blood Session">Part 2 – Advanced Practical Live Blood Session</option>
                  <option value="Qualifi Level 5 Health and Social Care">Qualifi Level 5 Health and Social Care</option>
                  <option value="ATHE Level 4 Diploma in Business Management">ATHE Level 4 Diploma in Business Management</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
                >
                  Save Student Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
