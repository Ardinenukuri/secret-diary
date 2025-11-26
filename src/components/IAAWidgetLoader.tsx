'use client';

import { useEffect } from 'react';

const IAAWidgetLoader: React.FC = () => {
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      const authOrigin = new URL(process.env.NEXT_PUBLIC_IAA_FRONTEND_URL!).origin;
      if (event.origin !== authOrigin) return;

      const { type, code, state } = event.data;
      if (type === 'iaa-auth-callback') {
        const storedState = sessionStorage.getItem('oauth_state_iaa');
        sessionStorage.removeItem('oauth_state_iaa');

        if (!state || state !== storedState) {
          console.error('OAuth state mismatch detected.');
          return;
        }
        
        window.location.href = `/callback?code=${code}`;
      }
    };
    window.addEventListener('message', handleAuthMessage);
    if (document.getElementById('iaa-widget-script')) return;

    (window as any).initIAAWidget = () => {
      if (typeof (window as any).IAAAuthWidget !== 'undefined') {
        new (window as any).IAAAuthWidget({
          clientId: process.env.NEXT_PUBLIC_IAA_CLIENT_ID,
          redirectUri: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/callback`, 
          iaaFrontendUrl: process.env.NEXT_PUBLIC_IAA_FRONTEND_URL,
        });
      } else {
        console.error('IAAAuthWidget class not found after init callback.');
      }
    };

    const script = document.createElement('script');
    script.id = 'iaa-widget-script';
    script.src = `${process.env.NEXT_PUBLIC_IAA_URL}/widgets/iaa-widget.js`;
    script.async = true;
    script.onerror = () => console.error('Failed to load the IAA authentication widget script.');
    document.body.appendChild(script);

    // --- Cleanup ---
    return () => {
      window.removeEventListener('message', handleAuthMessage);
      const existingScript = document.getElementById('iaa-widget-script');
      if (existingScript) document.body.removeChild(existingScript);
      delete (window as any).initIAAWidget;
    };
  }, []);

  return null;
};

export default IAAWidgetLoader;