"use client";

import React, { useState } from "react";
import { Save, Radio, Bell, Shield, Database } from "lucide-react";

export default function SettingsPage() {
  const [wsUrl, setWsUrl] = useState("ws://localhost:8080/ws/calls");
  const [maxWaitThreshold, setMaxWaitThreshold] = useState(60);
  const [alertEmail, setAlertEmail] = useState("admin@callcenter.com");
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">System Settings & Integrations</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure real-time WebSocket endpoints and alert threshold rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Backend Endpoint Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Radio className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">Go Backend Connection</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WebSocket Server URL
            </label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Default route for streaming live call events from the Go orchestrator.
            </p>
          </div>
        </div>

        {/* Threshold & Notification Alerts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bell className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">Threshold & Monitoring Alerts</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Wait Time Alert Threshold (Seconds)
              </label>
              <input
                type="number"
                value={maxWaitThreshold}
                onChange={(e) => setMaxWaitThreshold(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notification Recipient Email
              </label>
              <input
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>

          {savedMessage && (
            <span className="text-xs font-semibold text-emerald-600 animate-fade-in">
              ✓ Settings saved successfully!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}