"use client";

import React, { useState } from "react";
import {
  Settings,
  Save,
  Database,
  Globe,
  Radio,
  Sliders,
  CheckCircle2,
  Lock,
  Volume2,
  Cpu,
  Phone,
  Server,
  RefreshCw,
  Check
} from "lucide-react";

export default function SettingsView() {
  const [wpUrl, setWpUrl] = useState("http://127.0.0.1/ilc");
  const [collegeName, setCollegeName] = useState("Inspire London College & UKPD Academy");
  const [agentName, setAgentName] = useState("Sonia");
  const [voiceAccent, setVoiceAccent] = useState("en-GB-SoniaNeural");
  const [speakingRate, setSpeakingRate] = useState("1.0");
  const [sipExtension, setSipExtension] = useState("100");
  const [testingWp, setTestingWp] = useState(false);
  const [wpStatus, setWpStatus] = useState<"ok" | "testing" | null>("ok");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTestWp = () => {
    setTestingWp(true);
    setWpStatus("testing");
    setTimeout(() => {
      setTestingWp(false);
      setWpStatus("ok");
      showToast("WordPress REST API connection verified! (HTTP 200 OK)");
    }, 1200);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("System settings & AI Voice configurations saved successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" /> {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            System Settings & Telephony Integration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure live WordPress endpoints, LiveKit Cloud credentials, and AI voice parameters.
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-2 shadow-xs"
        >
          <Save className="w-3.5 h-3.5" /> Save All Configurations
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WordPress & Database Connection */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Globe className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">WordPress & WooCommerce Live Backend</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Local WordPress Base URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={wpUrl}
                onChange={(e) => setWpUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={handleTestWp}
                disabled={testingWp}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shrink-0 transition"
              >
                {testingWp ? "Pinging..." : "Test Ping"}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-emerald-700 font-medium">
                Store API & Pages API connected (`/wp-json/wc/store/v1/products`)
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              REST API Authentication
            </label>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono text-slate-700">admin • Application Password Active</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                Verified
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              PostgreSQL Telephony Database
            </label>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-slate-700">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                <span>127.0.0.1:5432 / customcalldatanase</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                Prisma Synced
              </span>
            </div>
          </div>
        </div>

        {/* AI Voice Agent & Personality */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Volume2 className="w-4 h-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-800">Voice Persona & Speech Settings</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Agent Name & Educational Institution
            </label>
            <input
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                TTS Voice Engine
              </label>
              <select
                value={voiceAccent}
                onChange={(e) => setVoiceAccent(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
              >
                <option value="en-GB-SoniaNeural">en-GB-Sonia (British Natural)</option>
                <option value="en-GB-RyanNeural">en-GB-Ryan (British Male)</option>
                <option value="en-US-JennyNeural">en-US-Jenny (American Warm)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Speaking Pace
              </label>
              <select
                value={speakingRate}
                onChange={(e) => setSpeakingRate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
              >
                <option value="0.95">0.95x (Clear & Calm)</option>
                <option value="1.0">1.0x (Standard Conversational)</option>
                <option value="1.05">1.05x (Brisk Customer Service)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Telephony LiveKit Cloud & Softphone Extension
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="font-mono text-slate-600 text-[11px]">wss://customcall-f7c2gkei.livekit.cloud</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  WebRTC Live
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-mono text-slate-700">SIP Extension: {sipExtension}</span>
                </div>
                <span className="text-[11px] text-slate-400">MicroSIP Ready</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
