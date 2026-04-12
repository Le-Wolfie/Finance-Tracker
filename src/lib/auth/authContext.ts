import { createContext } from "react";

export type AuthContextValue = {
  token: string | null;
  email: string | null;
  isAuthenticated: boolean;
  login: (token: string, expiresAt: string, email: string) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
