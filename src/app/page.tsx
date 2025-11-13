import LoginButton from "@/components/LoginButton";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="max-w-xl w-full p-8 bg-white rounded-lg shadow text-center space-y-6">
        <h1 className="text-3xl font-bold">Welcome to My Secret Diary</h1>
        <p className="text-zinc-600">
          A safe and private space for your thoughts. Please log in to continue.
        </p>
        <div className="flex justify-center">
          <LoginButton />
        </div>
      </div>
    </main>
  );
}
