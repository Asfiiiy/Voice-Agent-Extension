"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  Database,
  Volume2,
  Mic,
  ShieldCheck,
  PhoneCall,
  Clock,
  Settings2,
  BookOpen,
  UserCheck,
  Cpu,
  Layers,
  PhoneForwarded,
  Sliders,
  Check
} from "lucide-react";

export default function AgentsPage() {
  const [interruptionHandling, setInterruptionHandling] = useState(true);
  const [liveDbSync, setLiveDbSync] = useState(true);
  const [conversationalFillers, setConversationalFillers] = useState(true);
  const [humanHandoff, setHumanHandoff] = useState(true);

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
              AI Workforce & Telephony Cockpit
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Agent Operations & Persona Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor real-time voice latency, active database connectors, and AI agent configuration.
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"
        >
          ← Back to Main Dashboard
        </Link>
      </div>

      {/* Primary Hero: Sonia AI Agent Card */}
      <div className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                <Bot className="w-8 h-8" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900">Sonia</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live & Listening
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Lead Admissions AI
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspire London College & UK Professional Development Academy
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-500" /> en-GB-SoniaNeural (British)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium">
                  <Cpu className="w-3.5 h-3.5 text-violet-500" /> Google Gemini 2.5 Flash
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium">
                  <Database className="w-3.5 h-3.5 text-emerald-500" /> Live WooCommerce API Synced
                </span>
              </div>
            </div>
          </div>

          {/* Quick Latency & Performance Badges */}
          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center min-w-[110px]">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Latency</p>
              <p className="text-base font-extrabold text-indigo-600 mt-0.5">460 ms</p>
              <span className="text-[9px] text-emerald-600 font-semibold">Sub-second</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center min-w-[110px]">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Containment</p>
              <p className="text-base font-extrabold text-emerald-600 mt-0.5">96.8%</p>
              <span className="text-[9px] text-slate-400 font-medium">Zero Human Help</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center min-w-[110px]">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dial Extension</p>
              <p className="text-base font-extrabold text-slate-800 mt-0.5 font-mono">100</p>
              <span className="text-[9px] text-slate-400 font-medium">MicroSIP / SIP</span>
            </div>
          </div>
        </div>

        {/* Live Integrated Tools & Capabilities */}
        <div className="pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> Active Autonomous Capabilities & Tools
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Live Course & Dates Engine</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Direct connection to local WooCommerce Store API. Automatically extracts sale prices (e.g. £80 vs £199), classroom Saturday dates, and seat availability.
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-mono text-indigo-700 bg-white/80 px-2 py-1 rounded-md border border-indigo-100">
                <Check className="w-3 h-3 text-emerald-600" /> Tool: search_website
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-100/80">
              <div className="flex items-center gap-2 text-violet-900 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-violet-600" />
                <span>Policies & Institutional Info</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Scans official WordPress pages for refund terms, cancellation rules, ATHE/Qualifi university progression routes, and accreditation credibility.
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-mono text-violet-700 bg-white/80 px-2 py-1 rounded-md border border-violet-100">
                <Check className="w-3 h-3 text-emerald-600" /> Route: /wp-json/wp/v2/pages
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/80">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Student Enrollment Verification</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Authenticated lookup via WordPress Application Password. Validates student order IDs (e.g. #117070) or emails to confirm registration status live on-call.
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-mono text-emerald-700 bg-white/80 px-2 py-1 rounded-md border border-emerald-100">
                <Check className="w-3 h-3 text-emerald-600" /> Tool: check_student_enrollment
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Persona Controls & Behavior Toggles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" /> Voice Agent Behavioral Controls
          </h3>
          <p className="text-xs text-slate-500">
            Real-time toggles affecting Sonia's conversational behavior and latency management.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">Dynamic Interruption Handling</p>
                <p className="text-[10px] text-slate-500">Silero VAD allows caller to interrupt Sonia mid-sentence</p>
              </div>
              <button
                onClick={() => setInterruptionHandling(!interruptionHandling)}
                className={`w-11 h-6 rounded-full transition-colors relative ${interruptionHandling ? "bg-indigo-600" : "bg-slate-300"}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${interruptionHandling ? "right-1" : "left-1"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">Natural Filler Audio</p>
                <p className="text-[10px] text-slate-500">Speaks *"Let me look that up for you"* while querying database</p>
              </div>
              <button
                onClick={() => setConversationalFillers(!conversationalFillers)}
                className={`w-11 h-6 rounded-full transition-colors relative ${conversationalFillers ? "bg-indigo-600" : "bg-slate-300"}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${conversationalFillers ? "right-1" : "left-1"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">10-Minute Database Caching</p>
                <p className="text-[10px] text-slate-500">Eliminates repeated WordPress load for common queries</p>
              </div>
              <button
                onClick={() => setLiveDbSync(!liveDbSync)}
                className={`w-11 h-6 rounded-full transition-colors relative ${liveDbSync ? "bg-indigo-600" : "bg-slate-300"}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${liveDbSync ? "right-1" : "left-1"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">Human Escalation Routing</p>
                <p className="text-[10px] text-slate-500">Auto-routes to Human Agent on complex fee disputes</p>
              </div>
              <button
                onClick={() => setHumanHandoff(!humanHandoff)}
                className={`w-11 h-6 rounded-full transition-colors relative ${humanHandoff ? "bg-indigo-600" : "bg-slate-300"}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${humanHandoff ? "right-1" : "left-1"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Human Escalation Staff (Tier-2 Fallback) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PhoneForwarded className="w-4 h-4 text-emerald-600" /> Human Escalation Team (Tier-2)
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Backup Staff</span>
          </div>
          <p className="text-xs text-slate-500">
            Admissions officers available if Sonia transfers an escalated student call.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  JL
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Jordan Lee</p>
                  <p className="text-[10px] text-slate-500">Senior Admissions Officer (Ext: 102)</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Available
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-xs">
                  EV
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Dr. Eleanor Vance</p>
                  <p className="text-[10px] text-slate-500">Academic Progression Director (Ext: 103)</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                In Meeting
              </span>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-[11px] text-indigo-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Smart Handoff:</strong> When a caller asks to speak to a human supervisor, Sonia automatically places the call in queue for Jordan Lee.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}