import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken");
  if (!token) {
    redirect("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="max-w-2xl w-full p-8 bg-white rounded-lg shadow space-y-6">
        <h1 className="text-3xl font-bold">My Secret Diary</h1>
        <textarea
          className="w-full h-40 p-3 border rounded-md focus:outline-none focus:ring"
          placeholder="Write your new entry here..."
        />
        <div className="flex items-center justify-between">
          <button className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800">
            Submit Entry
          </button>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
