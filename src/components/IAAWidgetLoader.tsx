'use client';

import { useEffect, useState } from 'react';
import { CiLogout } from "react-icons/ci";

const IAAWidgetLoader: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /* ================================
     AUTH STATE (from localStorage)
  ================================= */

  useEffect(() => {
    const checkAuth = () => {
      const tokens = localStorage.getItem('auth_tokens');

      if (!tokens) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const parsed = JSON.parse(tokens);
        setIsAuthenticated(!!parsed?.accessToken);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Sync across tabs
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  /* ================================
     IAA OAUTH CALLBACK LISTENER
  ================================= */

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      const authOrigin = new URL(
        process.env.NEXT_PUBLIC_IAA_FRONTEND_URL!
      ).origin;

      if (event.origin !== authOrigin) return;

      const { type, code, state } = event.data;

      if (type === 'iaa-auth-callback') {
        const storedState = sessionStorage.getItem('oauth_state_iaa');
        sessionStorage.removeItem('oauth_state_iaa');

        if (!state || state !== storedState) return;

        window.location.href = `/callback?code=${code}`;
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  /* ================================
     IAA WIDGET LOADER
  ================================= */

  useEffect(() => {
    if (document.getElementById('iaa-widget-script')) return;

    (window as any).initIAAWidget = () => {
      if (typeof (window as any).IAAAuthWidget !== 'undefined') {
        (window as any).iaa = {
          engine: new (window as any).IAAAuthWidget({
            clientId: process.env.NEXT_PUBLIC_IAA_CLIENT_ID,
            redirectUri: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/callback`,
            iaaFrontendUrl: process.env.NEXT_PUBLIC_IAA_FRONTEND_URL,
          }),
        };

        console.log('[IAA] Widget initialized');
      }
    };

    const script = document.createElement('script');
    script.id = 'iaa-widget-script';
    script.src = `${process.env.NEXT_PUBLIC_IAA_URL}/widgets/iaa-widget.js`;
    script.async = true;
    script.onerror = () => console.error('Failed to load IAA widget');
    document.body.appendChild(script);

    return () => {
      const script = document.getElementById('iaa-widget-script');
      if (script) document.body.removeChild(script);
      delete (window as any).initIAAWidget;
    };
  }, []);

  /* ================================
     LOGOUT (SINGLE DEVICE)
  ================================= */

  const handleLogout = () => {
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('iaa_authenticated');

    setIsAuthenticated(false);

    // Optional but clean
    window.location.href = '/';
  };

  /* ================================
     ONLY SHOW LOGOUT IF AUTHENTICATED
  ================================= */

  if (!isAuthenticated) return null;

  return (
    <button
      onClick={handleLogout}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        padding: '12px 25px',
        width: '200px',
        borderRadius: '5px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        color: '#fff',
        backgroundColor: '#ff0404ff',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        gap: '25px',
      }}
    >
      <CiLogout  size={20} />
      Logout
    </button>
  );
};

export default IAAWidgetLoader;
