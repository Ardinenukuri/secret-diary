"use client";

import React from "react";

function randomState(length = 32) {
  const array = new Uint8Array(length);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const LoginButton: React.FC = () => {
  const onClick = () => {
    const authBase = process.env.NEXT_PUBLIC_IAA_AUTH_URL;
    const clientId = process.env.NEXT_PUBLIC_IAA_CLIENT_ID;
    const appBase = process.env.NEXT_PUBLIC_APP_BASE_URL;

    if (!authBase || !clientId || !appBase) {
      console.error("Missing required environment variables for OAuth redirect.");
      return;
    }

    const state = randomState(16);
    const redirectUri = `${appBase}/api/callback`;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });

    const url = `${authBase}/auth/login?${params.toString()}`;
    window.location.href = url;
  };

  return (
    <button
      onClick={onClick}
      className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
    >
      Login with IST Africa Auth
    </button>
  );
};

export default LoginButton;
