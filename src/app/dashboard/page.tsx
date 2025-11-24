import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ThoughtWorkspace from "@/components/ThoughtWorkspace";

type DiaryEntry = {
  id: number;
  content: string;
  created_at?: string;
  updated_at?: string;
};

async function fetchEntries(token?: string | undefined | null): Promise<DiaryEntry[]> {
  if (!token) return [];
  const backendBase =
    process.env.BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://localhost:4000";

  try {
    const response = await fetch(`${backendBase.replace(/\/$/, "")}/entries`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[dashboard] Failed to fetch entries:", await response.text());
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch (error) {
    console.error("[dashboard] Error fetching entries:", error);
    return [];
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken");
  if (!token) {
    redirect("/");
  }
  const entries = await fetchEntries(token.value);

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
        <ThoughtWorkspace entries={entries} />
      </div>
    </main>
  );
}
