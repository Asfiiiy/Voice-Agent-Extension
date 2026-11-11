"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Clock,
  Check,
  Coffee,
  Utensils,
  Power,
  CircleDot,
  Radio,
  UserCheck,
  AlertCircle
} from "lucide-react";

export type AgentStatusType = "AVAILABLE" | "SHORT_BREAK" | "LUNCH" | "OFFLINE" | "ON_CALL";

export interface StatusConfig {
  id: AgentStatusType;
  label: string;
  shortLabel: string;
  icon: string;
  colorClass: string;
  bgLightClass: string;
  borderClass: string;
  dotColor: string;
  description: string;
  canReceiveCalls: boolean;
  maxMinutes?: number;
}

export const STATUS_CONFIGS: Record<AgentStatusType, StatusConfig> = {
  AVAILABLE: {
    id: "AVAILABLE",
    label: "Available",
    shortLabel: "Available",
    icon: "🟢",
    colorClass: "text-emerald-700",
    bgLightClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
    dotColor: "bg-emerald-500",
    description: "Ready to accept inbound and transferred calls",
    canReceiveCalls: true,
  },
  SHORT_BREAK: {
    id: "SHORT_BREAK",
    label: "Short Break (10m)",
    shortLabel: "Break (10m)",
    icon: "🟡",
    colorClass: "text-amber-700",
    bgLightClass: "bg-amber-50",
    borderClass: "border-amber-200",
    dotColor: "bg-amber-500",
    description: "Quick rest pause — incoming calls paused",
    canReceiveCalls: false,
    maxMinutes: 10,
  },
  LUNCH: {
    id: "LUNCH",
    label: "Lunch Break",
    shortLabel: "Lunch",
    icon: "🍽️",
    colorClass: "text-blue-700",
    bgLightClass: "bg-blue-50",
    borderClass: "border-blue-200",
    dotColor: "bg-blue-500",
    description: "Mid-day meal — calls paused",
    canReceiveCalls: false,
    maxMinutes: 45,
  },
  OFFLINE: {
    id: "OFFLINE",
    label: "Offline",
    shortLabel: "Offline",
    icon: "🔴",
    colorClass: "text-slate-600",
    bgLightClass: "bg-slate-100",
    borderClass: "border-slate-300",
    dotColor: "bg-slate-400",
    description: "Logged off the telephony queue",
    canReceiveCalls: false,
  },
  ON_CALL: {
    id: "ON_CALL",
    label: "On Active Call",
    shortLabel: "On Call",
    icon: "📞",
    colorClass: "text-rose-700",
    bgLightClass: "bg-rose-50",
    borderClass: "border-rose-200",
    dotColor: "bg-rose-500 animate-pulse",
    description: "Currently speaking with a student",
    canReceiveCalls: false,
  },
};

interface StatusSelectorDropdownProps {
  memberId?: string;
  memberName?: string;
  initialStatus?: AgentStatusType;
  onStatusChange?: (newStatus: AgentStatusType) => void;
  compact?: boolean;
}

export default function StatusSelectorDropdown({
  memberId,
  memberName = "Sarah Jenkins",
  initialStatus = "AVAILABLE",
  onStatusChange,
  compact = false,
}: StatusSelectorDropdownProps) {
  const [currentStatus, setCurrentStatus] = useState<AgentStatusType>(initialStatus);
  const [isOpen, setIsOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Timer: count seconds elapsed in current status
  useEffect(() => {
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStatus]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectStatus = async (status: AgentStatusType) => {
    if (status === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    setCurrentStatus(status);
    setIsOpen(false);

    try {
      // Persist manual status update to backend database
      await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: memberId,
          name: memberName,
          status: status,
        }),
      });

      if (onStatusChange) {
        onStatusChange(status);
      }
    } catch (err) {
      console.error("Failed to update status on server:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const activeConfig = STATUS_CONFIGS[currentStatus] || STATUS_CONFIGS.AVAILABLE;

  // Options that team members can manually pick
  const selectableStatuses: AgentStatusType[] = ["AVAILABLE", "SHORT_BREAK", "LUNCH", "OFFLINE"];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating || currentStatus === "ON_CALL"}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
          activeConfig.bgLightClass
        } ${activeConfig.borderClass} ${activeConfig.colorClass} hover:opacity-90 active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed`}
        title={`Current Status: ${activeConfig.label} (${activeConfig.description})`}
      >
        <span className="relative flex h-2.5 w-2.5">
          {currentStatus === "AVAILABLE" && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${activeConfig.dotColor}`} />
        </span>

        <span className="flex items-center gap-1.5">
          <span className="font-bold">{compact ? activeConfig.shortLabel : activeConfig.label}</span>
          <span className="text-[10px] opacity-75 font-mono px-1.5 py-0.2 rounded bg-black/5">
            {formatTimer(elapsedSeconds)}
          </span>
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 opacity-70 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-800">{memberName}</p>
              <p className="text-[10px] text-slate-500">Manual Presence Controller</p>
            </div>
            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600 font-semibold">
              {formatTimer(elapsedSeconds)} in status
            </span>
          </div>

          <div className="p-2 space-y-1">
            {selectableStatuses.map((stId) => {
              const cfg = STATUS_CONFIGS[stId];
              const isSelected = currentStatus === stId;

              return (
                <button
                  key={stId}
                  onClick={() => handleSelectStatus(stId)}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition ${
                    isSelected
                      ? `${cfg.bgLightClass} ${cfg.borderClass} border`
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="text-base leading-none mt-0.5">{cfg.icon}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isSelected ? cfg.colorClass : "text-slate-800"}`}>
                        {cfg.label}
                      </span>
                      {isSelected && <Check className={`w-3.5 h-3.5 ${cfg.colorClass}`} />}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">
                      {cfg.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Calls are delivered <strong>only</strong> when marked 🟢 Available.</span>
          </div>
        </div>
      )}
    </div>
  );
}
