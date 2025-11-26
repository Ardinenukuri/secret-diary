// Client-side auth utilities
const TOKEN_KEY = 'auth_tokens';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export const getTokens = (): AuthTokens | null => {
  if (typeof window === 'undefined') return null;
  const tokens = localStorage.getItem(TOKEN_KEY);
  return tokens ? JSON.parse(tokens) : null;
};

export const setTokens = (tokens: AuthTokens): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
};

export const clearTokens = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
};

export const getAccessToken = (): string | null => {
  const tokens = getTokens();
  return tokens?.accessToken || null;
};

export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};
