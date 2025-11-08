export async function register({ name, email, password }) {
  const res = await fetch('http://localhost:8081/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  })
  if (!res.ok) throw new Error(await safeText(res) || `Register failed (${res.status})`)
  const data = await res.json()
  if (!data?.token) throw new Error('No token returned')
  return data.token
}

export async function login({ email, password }) {
  const res = await fetch('http://localhost:8081/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!res.ok) throw new Error(await safeText(res) || `Login failed (${res.status})`)
  const data = await res.json()
  if (!data?.token) throw new Error('No token returned')
  return data.token
}

export async function authorizeConnection(platform, redirectUri, token) {
  const url = new URL(`http://localhost:8081/api/connections/${encodeURIComponent(platform)}/authorize`)
  url.searchParams.set('redirectUri', redirectUri)
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error(await safeText(res) || `Authorize failed (${res.status})`)
  return res.json()
}

export async function completeConnection(provider, code, token, redirectUri) {
  const res = await fetch(`http://localhost:8081/api/connections/${encodeURIComponent(provider)}/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ code, redirectUri })
  })
  if (!res.ok) throw new Error(await safeText(res) || `Callback failed (${res.status})`)
  return res.json()
}

export async function fetchActiveConnections(token) {
  const res = await fetch('http://localhost:8081/api/connections/active', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await safeText(res) || `Fetch connections failed (${res.status})`)
  const data = await res.json()
  return Array.isArray(data?.content) ? data.content : []
}

export async function disconnectConnection(id, token) {
  const res = await fetch(`http://localhost:8081/api/connections/${encodeURIComponent(id)}/disconnect`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await safeText(res) || `Disconnect failed (${res.status})`)
  return res.json().catch(() => ({}))
}

async function safeText(res) {
  try { return await res.text() } catch { return '' }
}
