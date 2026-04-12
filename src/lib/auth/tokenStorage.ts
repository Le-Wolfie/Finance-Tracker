const TOKEN_KEY = "ft_token";
const EXPIRY_KEY = "ft_token_expiry";
const EMAIL_KEY = "ft_user_email";

export function setAuthSession(
  token: string,
  expiresAt: string,
  email: string,
): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRY_KEY, expiresAt);
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredExpiry(): string | null {
  return localStorage.getItem(EXPIRY_KEY);
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function isSessionExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return true;
  }

  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) {
    return true;
  }

  return Date.now() >= expiry;
}
