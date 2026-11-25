const API_BASE = import.meta.env.VITE_API_URL || '';

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE) {
    return cleanPath;
  }
  const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  return `${cleanBase}${cleanPath}`;
}
