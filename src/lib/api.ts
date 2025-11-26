import { getAccessToken } from './auth';

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAccessToken();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Still include cookies for any server-side auth
  });

  if (response.status === 401) {
    // Handle unauthorized (e.g., token expired)
    window.location.href = '/';
    return;
  }

  return response;
};
