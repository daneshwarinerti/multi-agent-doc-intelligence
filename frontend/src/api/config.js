/**
 * Central API configuration helper.
 * Supports production deployments via VITE_API_BASE_URL
 * while preserving local Vite dev proxy fallback.
 */

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
