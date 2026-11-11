"use client";

import React, { useState } from "react";
import {
  Bot,
  Cpu,
  Database,
  Volume2,
  Check,
  BookOpen,
  ShieldCheck,
  UserCheck,
  Sliders,
  PhoneForwarded,
  Zap,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink
} from "lucide-react";

export default function AgentsView() {
  const [interruptionHandling, setInterruptionHandling] = useState(true);
  const [liveDbSync, setLiveDbSync] = useState(true);
  const [conversationalFillers, setConversationalFillers] = useState(true);
  const [humanHandoff, setHumanHandoff] = useState(true);
  const [savingToast, setSavingToast] = useState(false);

  const triggerSave = () => {
    setSavingToast(true);
    setTimeout(() => setSavingToast(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {savingToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" /> Agent configuration updated successfully!
        </div>
      )}

      {/* Hero: Primary Voice Agent (Sonia) */}
      <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/60 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Bot className="w-8 h-8" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900">Sonia</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live & Listening
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Lead Admissions AI
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Inspire London College & UK Professional Development Academy
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> en-GB-SoniaNeural (British)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Cpu className="w-3.5 h-3.5 text-violet-600" /> Google Gemini 2.5 Flash
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium text-emerald-700">
                  <Database className="w-3.5 h-3.5 text-emerald-600" /> Live WooCommerce API Synced
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center min-w-[110px]">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Latency</p>
              <p className="text-base font-extrabold text-indigo-600 mt-0.5">460 ms</p>
              <span className="text-[9px] text-emerald-600 font-semibold">Sub-second</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center min-w-[110px]">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Containment</p>
              <p className="text-base font-extrabold text-emerald-600 mt-0.5">96.8%</p>
              <span className="text-[9px] text-slate-400 font-medium">Autonomous</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center min-w-[110px]">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SIP Target</p>
              <p className="text-base font-extrabold text-slate-800 mt-0.5 font-mono">100</p>
              <span className="text-[9px] text-slate-400 font-medium">MicroSIP</span>
            </div>
          </div>
        </div>

        {/* Live Integrated Tools */}
        <div className="pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> Active Autonomous Capabilities & REST Tools
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Live Course & Dates Engine</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                Connects to WooCommerce Store API. Fetches accurate sale prices (£80 vs £199), Saturday practical sessions, and seat availability.
              </p>
              <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-indigo-700 bg-white px-2.5 py-1 rounded-md border border-indigo-100">
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> Tool: search_website</span>
                <span className="text-[9px] text-slate-400">10m Cache</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-violet-50/40 border border-violet-100">
              <div className="flex items-center gap-2 text-violet-900 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-violet-600" />
                <span>Policies & Institutional Info</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                Queries WordPress Pages API for refund policies, university progression routes (ATHE/Qualifi), and college accreditations.
              </p>
              <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-violet-700 bg-white px-2.5 py-1 rounded-md border border-violet-100">
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> Route: /wp/v2/pages</span>
                <span className="text-[9px] text-slate-400">Live Sync</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Student Order Verification</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                Uses authenticated Application Passwords to verify student order numbers (e.g. #117070) or emails and confirms active enrollment.
              </p>
              <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-emerald-700 bg-white px-2.5 py-1 rounded-md border border-emerald-100">
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> Tool: check_student_enrollment</span>
                <span className="text-[9px] text-slate-400">Auth WC/v3</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral Controls & Human Fallback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Behavioral Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" /> Voice Agent Behavioral Controls
            </h3>
            <button
              onClick={triggerSave}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Save Changes
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Real-time latency and conversation management rules applied during live phone calls.
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">Dynamic Interruption Handling</p>
                <p className="text-[10px] text-slate-500">Silero VAD allows caller to interrupt Sonia mid-sentence</p>
              </div>
              <button
                onClick={() => { setInterruptionHandling(!interruptionHandling); triggerSave(); }}
                className={`w-10 h-5 rounded-full transition-colors relative ${interruptionHandling ? "bg-indigo-600" : "bg-slate-300"}`}
              >
                <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${interruptionHandling ? "right-1" : "left-1"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">Natural Filler Audio</p>
                <p className="text-[10px] text-slate-500">Speaks filler phrases while querying the database</p>
              </div>
              <button
                onClick={() => { setConversationalFillers(!conversationalFillers); triggerSave(); }}
                className={`w-10 h-5 rounded-full transition-colors relative ${conversationalFillers ? "bg-indigo-600" : "bg-slate-300"}`}
              >
                <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${conversationalFillers ? "right-1" : "left-1"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">In-Memory Database Caching</p>
                <p className="text-[10px] text-slate-500">10-minute cache prevents redundant server load</p>
              </div>
              <button
                onClick={() => { setLiveDbSync(!liveDbSync); triggerSave(); }}
                className={`w-10 h-5 rounded-full transition-colors relative ${liveDbSync ? "bg-indigo-600" : "bg-slate-300"}`}
              >
                <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${liveDbSync ? "right-1" : "left-1"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">Human Escalation Routing</p>
                <p className="text-[10px] text-slate-500">Enables warm transfer to human officer on complex disputes</p>
              </div>
              <button
                onClick={() => { setHumanHandoff(!humanHandoff); triggerSave(); }}
                className={`w-10 h-5 rounded-full transition-colors relative ${humanHandoff ? "bg-indigo-600" : "bg-slate-300"}`}
              >
                <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${humanHandoff ? "right-1" : "left-1"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Human Escalation Staff */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PhoneForwarded className="w-4 h-4 text-emerald-600" /> Human Escalation Team (Tier-2)
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Backup Staff</span>
          </div>
          <p className="text-xs text-slate-500">
            Admissions officers available if Sonia transfers an escalated student call.
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
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

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-xs">
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

            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Smart Handoff:</strong> When a caller asks to speak to a human supervisor, Sonia automatically transfers the call to Extension 102 (Jordan Lee).
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
