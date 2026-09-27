import axios from 'axios'
import { Capacitor } from '@capacitor/core'

// On a native build, 127.0.0.1/localhost means the device itself, not the
// machine running the backend. The Android emulator maps the host's
// localhost to 10.0.2.2, so remap loopback URLs when running natively —
// a real deployed VITE_API_URL is untouched since it's never loopback.
function resolveBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
  if (!Capacitor.isNativePlatform()) return url
  return url.replace(/(127\.0\.0\.1|localhost)/, '10.0.2.2')
}

const api = axios.create({
  baseURL: resolveBaseUrl(),
})

export function extractError(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return detail || 'Something went wrong. Is the backend running?'
}

export function authHeaders(token: string | null | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default api
