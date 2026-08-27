export function getStoredToken() {
  return localStorage.getItem("taskflow_token") ?? sessionStorage.getItem("taskflow_token") ?? ""
}

export function setStoredToken(token: string, remember = true) {
  if (remember) {
    localStorage.setItem("taskflow_token", token)
    sessionStorage.removeItem("taskflow_token")
    return
  }
  sessionStorage.setItem("taskflow_token", token)
  localStorage.removeItem("taskflow_token")
}

export function clearStoredToken() {
  localStorage.removeItem("taskflow_token")
  sessionStorage.removeItem("taskflow_token")
}

export function hasStoredToken() {
  return getStoredToken().length > 0
}

export function authHeaders() {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Request failed")
  }
  return payload as T
}
