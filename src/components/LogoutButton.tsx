"use client";

import React from "react";
import { useRouter } from "next/navigation";

const LogoutButton: React.FC = () => {
  const router = useRouter();

  const onClick = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.push("/");
    }
  };

  return (
    <button
      onClick={onClick}
      className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
    >
      Logout
    </button>
  );
};

export default LogoutButton;
