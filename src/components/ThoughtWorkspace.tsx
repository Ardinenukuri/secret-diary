"use client";

import { useMemo, useState } from "react";
import LogoutButton from "./LogoutButton";

type DiaryEntry = {
  id: number | string;
  content: string;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  entries: DiaryEntry[];
};

const tabs = [
  { id: "compose", label: "New Thought" },
  { id: "history", label: "Previous Thoughts" },
];

export default function ThoughtWorkspace({ entries }: Props) {
  const [activeTab, setActiveTab] = useState<string>("compose");

  const formattedEntries = useMemo(
    () =>
      (entries ?? []).map((entry) => ({
        ...entry,
        createdLabel: entry.created_at
          ? new Intl.DateTimeFormat("en", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(entry.created_at))
          : "Unknown date",
      })),
    [entries],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex rounded-2xl bg-slate-100 p-1 text-sm font-medium text-slate-500">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-2xl transition ${
                activeTab === tab.id
                  ? "bg-white text-indigo-600 shadow"
                  : "hover:text-indigo-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "compose" ? (
        <div className="space-y-4">
          <textarea
            className="w-full h-44 p-4 rounded-2xl border border-slate-200 bg-white/80 text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition"
            placeholder="Write your new entry here..."
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button className="rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-3 text-white font-medium shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-200">
              Submit Entry
            </button>
            <LogoutButton />
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-100 bg-white/70 p-4 max-h-72 overflow-y-auto space-y-4">
          {formattedEntries.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">
              No previous thoughts yet. Once you start writing, they&apos;ll appear here for easy reference.
            </div>
          ) : (
            formattedEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-400 mb-2">
                  {entry.createdLabel}
                </p>
                <p className="text-slate-700 whitespace-pre-line">
                  {entry.content.length > 240 ? `${entry.content.slice(0, 240)}…` : entry.content}
                </p>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}

