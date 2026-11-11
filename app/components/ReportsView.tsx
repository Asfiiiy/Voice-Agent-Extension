"use client";

import React, { useState } from "react";
import {
  BarChart2,
  TrendingUp,
  Download,
  Calendar,
  Award,
  CheckCircle2,
  PieChart as PieIcon,
  Clock,
  ArrowUpRight,
  FileSpreadsheet,
  Check
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from "recharts";

const courseData = [
  { name: "Phlebotomy (Pt 1 & 2)", calls: 542, share: 44, color: "#6366f1" },
  { name: "Health & Social Care", calls: 310, share: 25, color: "#8b5cf6" },
  { name: "Business Management", calls: 224, share: 18, color: "#ec4899" },
  { name: "Teacher Training (AET)", calls: 172, share: 13, color: "#10b981" }
];

const hourlyTrends = [
  { hour: "9 AM", calls: 32 },
  { hour: "10 AM", calls: 78 },
  { hour: "11 AM", calls: 145 },
  { hour: "12 PM", calls: 120 },
  { hour: "1 PM", calls: 95 },
  { hour: "2 PM", calls: 160 },
  { hour: "3 PM", calls: 130 },
  { hour: "4 PM", calls: 90 },
  { hour: "5 PM", calls: 45 }
];

const sentimentBreakdown = [
  { name: "Positive / Enrolling", value: 78, color: "#10b981" },
  { name: "Inquiry Seeking", value: 16, color: "#6366f1" },
  { name: "Price / Scheduling Concern", value: 6, color: "#f59e0b" }
];

export default function ReportsView() {
  const [dateRange, setDateRange] = useState("This Month");
  const [downloadToast, setDownloadToast] = useState(false);

  const handleDownloadCSV = () => {
    // Generate clean CSV content
    const headers = "Call_ID,Caller_Name,Phone,Course,Duration_Sec,Status,Sentiment,Timestamp\n";
    const sampleRows = [
      "CALL-101,Happy Okoromu,+447911123456,Phlebotomy Part 1,180,Answered,Positive,2026-10-01 11:20:00",
      "CALL-102,Ahmed Khan,+447822654321,Phlebotomy London Classroom,240,Answered,Positive,2026-10-01 10:45:00",
      "CALL-103,Sarah Jenkins,+447700900143,Qualifi Health and Social Care,195,Answered,Neutral,2026-09-30 15:10:00",
      "CALL-104,David O'Connor,+447555432198,ATHE Business Diploma,130,Answered,Positive,2026-09-30 14:00:00"
    ].join("\n");

    const blob = new Blob([headers + sampleRows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Admissions-Call-Report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    setDownloadToast(true);
    setTimeout(() => setDownloadToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {downloadToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" /> CSV Report generated and downloaded!
        </div>
      )}

      {/* Header with Export Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Admissions & Telephony Analytics Report
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional metrics across Inspire London College & UKPDA voice campaigns.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="Today">Today's Performance</option>
            <option value="This Week">Last 7 Days</option>
            <option value="This Month">This Month (September-October)</option>
            <option value="Quarter">Q3 Academic Term</option>
          </select>

          <button
            onClick={handleDownloadCSV}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-2 shadow-xs shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Export Report (CSV)
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Inbound Calls</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">1,248</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +24% vs last period
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Autonomous AI Containment</span>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1">96.4%</p>
          <p className="text-[11px] text-slate-400 mt-1">Resolved without human escalation</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Average Call Duration</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">2m 14s</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Optimal advisory pace</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Admissions Conversion Rate</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">28.6%</p>
          <p className="text-[11px] text-slate-400 mt-1">Inquiry to active registration</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
        {/* Hourly Volume Trends */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Peak Inquiry Call Times</h3>
              <p className="text-xs text-slate-400">Distribution of inbound student inquiries throughout the day</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              Peak: 2 PM (160 calls)
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyTrends}>
                <defs>
                  <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "11px",
                    border: "none"
                  }}
                />
                <Area type="monotone" dataKey="calls" stroke="#6366f1" strokeWidth={2.5} fill="url(#callGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Caller Sentiment Analysis */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">AI Sentiment & Caller Intent</h3>
            <p className="text-xs text-slate-400">Sentiment analyzed across voice transcripts</p>
          </div>

          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {sentimentBreakdown.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
                <span className="font-bold text-slate-800">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Course Demand Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Top Inquired Qualifications & Courses</h3>
          <p className="text-xs text-slate-400">Volume of student inquiries captured by Sonia per course</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {courseData.map((c) => (
            <div key={c.name} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 truncate" title={c.name}>{c.name}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                  {c.share}%
                </span>
              </div>
              <p className="text-xl font-extrabold text-slate-900">{c.calls} calls</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${c.share}%`, backgroundColor: c.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
