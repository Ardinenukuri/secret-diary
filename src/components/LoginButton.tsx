'use client';

import React, { useEffect } from 'react';

function randomState(length = 16) {
  const array = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const LoginButton: React.FC = () => {
  const openPopup = () => {
    const authUrl = process.env.NEXT_PUBLIC_IAA_AUTH_URL;
    const clientId = process.env.NEXT_PUBLIC_IAA_CLIENT_ID;
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL;

    if (!authUrl || !clientId || !appBaseUrl) {
      console.error('Missing required environment variables for OAuth redirect.');
      alert('Authentication is currently unavailable. Please contact support.');
      return;
    }

    const state = randomState();
    sessionStorage.setItem('oauth_state', state);

    const redirectUri = `${appBaseUrl}/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      display: 'popup',
    });

    const url = `${authUrl}/auth/login?${params.toString()}`;

    const width = 450;
    const height = 500;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      url,
      'iaa-login-popup',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    popup?.focus();
  };

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (!process.env.NEXT_PUBLIC_IAA_AUTH_URL) return;

      const authOrigin = new URL(process.env.NEXT_PUBLIC_IAA_AUTH_URL).origin;
      if (event.origin !== authOrigin) {
        return;
      }

      const { type, code, state } = event.data;

      if (type === 'iaa-auth-callback') {
        const storedState = sessionStorage.getItem('oauth_state');
        sessionStorage.removeItem('oauth_state');

        if (!storedState) {
          return;
        }

        if (!state || state !== storedState) {
          console.warn('OAuth state mismatch detected for login popup, ignoring message.');
          return;
        }
        
        window.location.href = `/callback?code=${code}`;
      }
    };

    window.addEventListener('message', handleAuthMessage);

    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
  }, []);

  return (
    <button
      onClick={openPopup}
      className="rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-3 text-white font-medium shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-200"
    >
      Login with IST Africa Auth
    </button>
  );
};

export default LoginButton;