import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  clearAuthSession,
  getStoredEmail,
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
  const [email, setEmail] = useState<string | null>(() => getStoredEmail());

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      email,
      isAuthenticated: Boolean(token),
      login: (nextToken: string, expiresAt: string, nextEmail: string) => {
        setAuthSession(nextToken, expiresAt, nextEmail);
        setToken(nextToken);
        setEmail(nextEmail);
      },
      logout: () => {
        clearAuthSession();
        setToken(null);
        setEmail(null);
      },
    }),
    [email, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
