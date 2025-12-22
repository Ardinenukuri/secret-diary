"use client";

import { useMemo, useState } from "react";
import LogoutButton from "./LogoutButton";
import { fetchWithAuth } from "@/lib/api"; 

type DiaryEntry = {
  id: number | string;
  content: string;
  created_at?: string;
};

type Props = {
  initialEntries: DiaryEntry[];
  setEntries: React.Dispatch<React.SetStateAction<DiaryEntry[]>>;
};

const tabs = [{ id: "compose", label: "New Thought" }, { id: "history", label: "Previous Thoughts" }];

export default function ThoughtWorkspace({ initialEntries, setEntries }: Props) {
  const [activeTab, setActiveTab] = useState<string>("compose");
  const [newThought, setNewThought] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formattedEntries = useMemo(
    () =>
      [...initialEntries].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).map((entry) => ({
        ...entry,
        createdLabel: entry.created_at
          ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.created_at))
          : "Unknown date",
      })),
    [initialEntries]
  );

  const handleSubmit = async () => {
    if (!newThought.trim()) return;
    setIsSubmitting(true);
    try {

      const response = await fetchWithAuth('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newThought }),
      });

      if (!response) return; 

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit entry');
      }
      
      const newEntry = await response.json();


      setEntries(prevEntries => [newEntry, ...prevEntries]);
      
      setNewThought("");
      setActiveTab("history");

    } catch (error) {
      console.error("Submission error:", error);
      alert(`Could not submit your thought: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex rounded-2xl bg-slate-100 p-1 text-sm font-medium text-slate-500">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-2xl transition ${activeTab === tab.id ? "bg-white text-indigo-600 shadow" : "hover:text-indigo-500"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {activeTab === "compose" ? (
        <div className="space-y-4">
          <textarea
            value={newThought}
            onChange={(e) => setNewThought(e.target.value)}
            className="w-full h-44 p-4 rounded-2xl border border-slate-200 bg-white/80 text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition"
            placeholder="Write your new entry here..."
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-3 text-white font-medium shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-200 disabled:opacity-50">
              {isSubmitting ? "Submitting..." : "Submit Entry"}
            </button>
            <LogoutButton />
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-100 bg-white/70 p-4 max-h-72 overflow-y-auto space-y-4">
          {formattedEntries.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">No previous thoughts yet.</div>
          ) : (
            formattedEntries.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-400 mb-2">{entry.createdLabel}</p>
                <p className="text-slate-700 whitespace-pre-line">{entry.content}</p>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}