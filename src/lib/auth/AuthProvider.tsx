import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  clearAuthSession,
  getStoredExpiry,
  getStoredToken,
  isSessionExpired,
  setAuthSession,
} from "./tokenStorage";
import { AuthContext, type AuthContextValue } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = getStoredToken();
    const storedExpiry = getStoredExpiry();

    if (!storedToken || isSessionExpired(storedExpiry)) {
      clearAuthSession();
      return null;
    }

    return storedToken;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login: (nextToken: string, expiresAt: string) => {
        setAuthSession(nextToken, expiresAt);
        setToken(nextToken);
      },
      logout: () => {
        clearAuthSession();
        setToken(null);
      },
    }),
    [token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
