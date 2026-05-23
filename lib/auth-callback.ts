const DEFAULT_AUTH_REDIRECT = "/dashboard";

export function safeAuthCallbackUrl(value?: string | null) {
  if (!value) return DEFAULT_AUTH_REDIRECT;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (trimmed.startsWith("/login") || trimmed.startsWith("/signup")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return trimmed;
}

export function authLinkWithCallback(path: "/login" | "/signup", callbackUrl: string) {
  const safeCallback = safeAuthCallbackUrl(callbackUrl);
  return `${path}?callbackUrl=${encodeURIComponent(safeCallback)}`;
}
