/**
 * Global API configuration and fetch interceptor.
 * Automatically prefixes relative `/api/...` calls with `VITE_API_URL`
 * when deployed separately on platforms like Vercel, Render, or Railway.
 */

const API_BASE = (import.meta.env.VITE_API_URL || '').trim();

export function setupApiInterceptor(): void {
  if (!API_BASE) {
    return;
  }

  const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (typeof input === 'string') {
      if (input.startsWith('/api/')) {
        return originalFetch(`${cleanBase}${input}`, init);
      }
    } else if (input instanceof URL) {
      if (input.pathname.startsWith('/api/')) {
        const targetUrl = `${cleanBase}${input.pathname}${input.search}`;
        return originalFetch(targetUrl, init);
      }
    } else if (input instanceof Request) {
      const url = new URL(input.url, window.location.origin);
      if (url.pathname.startsWith('/api/')) {
        const targetUrl = `${cleanBase}${url.pathname}${url.search}`;
        const newRequest = new Request(targetUrl, input);
        return originalFetch(newRequest, init);
      }
    }

    return originalFetch(input, init);
  };
}
