"use client";

import { useEffect, useState } from "react";
import ThoughtWorkspace from "@/components/ThoughtWorkspace";


type DiaryEntry = {
  id: string | number;
  content: string;
  created_at?: string;
};

import { fetchWithAuth } from "@/lib/api";

export default function DashboardPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const appBase = process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3001";

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetchWithAuth(`${appBase}/api/entries`);
        if (!response) return;
        
        if (response.ok) {
          const data = await response.json();
          setEntries(data);
        } else {
          const errorText = await response.text();
          console.error("[dashboard] Failed to fetch entries:", errorText);
          setError("Could not load your diary entries. Please try again later.");
        }
      } catch (error) {
        console.error("[dashboard] Error fetching entries:", error);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [appBase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading your thoughts...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-white to-sky-100 px-4 py-12">
      <div className="max-w-2xl w-full p-10 rounded-3xl bg-white/90 shadow-2xl backdrop-blur border border-white/40 space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Private thoughts</p>
          <h1 className="text-4xl font-semibold text-slate-900">My Secret Diary</h1>
          <p className="text-slate-500">
            Capture what&apos;s on your mind today. Your words stay safe and secure with you.
          </p>
        </div>
        <ThoughtWorkspace initialEntries={entries} setEntries={setEntries} />
      </div>
    </main>
  );
}