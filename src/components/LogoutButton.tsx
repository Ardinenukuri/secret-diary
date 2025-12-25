"use client";

import React from "react";
import { useRouter } from "next/navigation";
declare global {
  interface Window {
    iaa?: {
      logout: () => void;
    };
  }
}

const LogoutButton: React.FC = () => {
  const router = useRouter();

  const onClick = async () => {
    // try {
    //   // await fetch("/api/logout", { method: "POST" });

    //   if (window.iaa && typeof window.iaa.logout === 'function') {
    //     window.iaa.logout();
    //   } else {
    //     console.warn('[LogoutButton] iaa.logout() not found. Clearing localStorage manually.');
    //     localStorage.setItem('iaa_authenticated', 'false');
    //   }

    // } catch (error) {
    //   console.error("Logout failed:", error);
    // } finally {
      router.push("/secondpage");
      router.refresh();
    // }
  };

  return (
    <button
      onClick={onClick}
      className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
    >
      Second Page
    </button>
  );
};

export default LogoutButton;