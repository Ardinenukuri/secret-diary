import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ThoughtWorkspace from "@/components/ThoughtWorkspace";

// Simplified type for the frontend
type DiaryEntry = {
  id: number;
  content: string;
  created_at?: string;
};

// This function now fetches from our own Next.js API route (the proxy)
async function fetchEntries(): Promise<DiaryEntry[]> {
  // We need to pass the cookies along so the API route can use them.
  const cookieHeader = (await cookies()).toString();
  const appBase = process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3001";
  
  try {
    const response = await fetch(`${appBase}/api/entries`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[dashboard] Failed to fetch entries from proxy:", await response.text());
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error("[dashboard] Error fetching entries:", error);
    return [];
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const hasToken = cookieStore.get("accessToken");
  if (!hasToken) {
    redirect("/");
  }
  const entries = await fetchEntries();

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
        <ThoughtWorkspace initialEntries={entries} />
      </div>
    </main>
  );
}