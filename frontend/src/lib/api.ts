/**
 * Global API configuration and URL resolver.
 * Supports configurable backend URLs via `VITE_API_URL` or localStorage overrides.
 */

export function getApiBaseUrl(): string {
  // 1. Check window/localStorage override (useful for testing live backends without rebuilding)
  try {
    const saved = localStorage.getItem('skillbridge_api_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {}

  // 2. Check environment variable VITE_API_URL
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  return '';
}

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${cleanPath}` : cleanPath;
}

export function setupApiInterceptor(): void {
  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const base = getApiBaseUrl();
    if (!base) {
      return originalFetch(input, init);
    }

    if (typeof input === 'string') {
      if (input.startsWith('/api/')) {
        return originalFetch(`${base}${input}`, init);
      }
    } else if (input instanceof URL) {
      if (input.pathname.startsWith('/api/')) {
        const targetUrl = `${base}${input.pathname}${input.search}`;
        return originalFetch(targetUrl, init);
      }
    } else if (input instanceof Request) {
      const url = new URL(input.url, window.location.origin);
      if (url.pathname.startsWith('/api/')) {
        const targetUrl = `${base}${url.pathname}${url.search}`;
        const newRequest = new Request(targetUrl, input);
        return originalFetch(newRequest, init);
      }
    }

    return originalFetch(input, init);
  };
}
