import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../shared/Shell'

const TABS = ['ACTIVE', 'COMPLETED', 'CANCELED']
const BASE_URL = 'http://localhost:8081'

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function Generate() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('ACTIVE')
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  // Create drawer state
  const [createOpen, setCreateOpen] = useState(false)
  const [cName, setCName] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cPlatform, setCPlatform] = useState('INSTAGRAM')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState('')

  const token = useMemo(() => localStorage.getItem('token') ?? '', [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        if (!token) throw new Error('Missing auth token in localStorage (key: token)')
        const params = new URLSearchParams({
          status: tab,
          page: String(page),
          size: String(size),
          sort: 'createdAt,desc',
        })
        const res = await fetch(`${BASE_URL}/api/campaigns?${params.toString()}` , {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Request failed (${res.status}): ${text || res.statusText}`)
        }
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [tab, page, size, token])

  function onSelectTab(next) {
    setTab(next)
    setPage(0)
  }

  function nextPage() {
    if (data && !data.last) setPage((p) => p + 1)
  }

  function prevPage() {
    if (data && !data.first) setPage((p) => Math.max(0, p - 1))
  }

  async function handleCreate(e) {
    e?.preventDefault?.()
    try {
      setCreating(true)
      setCreateErr('')
      if (!token) throw new Error('Not authenticated')
      const payload = {
        name: cName,
        description: cDesc,
        platforms: [cPlatform],
      }
      // Try existing backend route first, then fallback if needed
      const urls = [
        `${BASE_URL}/api/campaigns`,
        `${BASE_URL}/api/campaigns/create`,
      ]
      let ok = false
      for (const u of urls) {
        const res = await fetch(u, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
        if (res.ok) { ok = true; break }
        if (res.status !== 404) {
          const txt = await res.text()
          throw new Error(txt || res.statusText)
        }
      }
      if (!ok) throw new Error('Create endpoint not found')

      // Success: switch to ACTIVE tab and reload
      setCreateOpen(false)
      setCName('')
      setCDesc('')
      setCPlatform('INSTAGRAM')
      setTab('ACTIVE')
      setPage(0)
    } catch (err) {
      setCreateErr(err.message || 'Failed to create campaign')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Shell>
      <div className="connections-head" style={{ marginBottom: 8 }}>
        <h1>Campaigns</h1>
        <div className="actions">
          <button className="primary-btn btn-sm" onClick={() => setCreateOpen(true)}>Create</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-3 nav-tabs" role="tablist" aria-label="Campaign status tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => onSelectTab(t)}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading && <div className="muted">Loading…</div>}
      {error && <div style={{ color: '#ef4444' }}>{error}</div>}

      {!loading && !error && (
        <>
          <table className="table" role="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Platforms</th>
                <th>Status</th>
                <th>Created</th>
                
              </tr>
            </thead>
            <tbody>
              {(data?.content ?? []).map((c) => (
                <tr key={c.id} onClick={() => navigate(`/campaigns/${c.id}/items`, { state: { name: c.name, status: c.status, platforms: c.platforms } })} style={{ cursor: 'pointer' }}>
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td className="cell-muted">{c.description || '-'}</td>
                  <td>
                    <div className="platforms">
{(c.platforms || []).map((p) => (
                        <span key={p} className={`badge pill ${String(p).toLowerCase()}`}>{p}</span>
                      ))}
                    </div>
                  </td>
                  <td><span className={`status-chip ${String(c.status||'').toLowerCase()}`}>{c.status}</span></td>
                  <td className="cell-muted">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && data.content.length === 0 && (
            <div className="muted" style={{ padding: 12 }}>No campaigns found</div>
          )}

          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <button className="btn-outline" onClick={prevPage} disabled={!data || data.first}>Prev</button>
            <span className="muted">
              Page {data ? data.number + 1 : 1} of {data ? Math.max(1, data.totalPages) : 1} · Total {data?.totalElements ?? 0}
            </span>
            <button className="btn-outline" onClick={nextPage} disabled={!data || data.last}>Next</button>
          </div>
        </>
      )}

      {createOpen && (
        <div className="drawer-backdrop" onClick={(e)=>{ if (e.target.classList.contains('drawer-backdrop')) setCreateOpen(false) }}>
          <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="create-campaign-title">
            <div className="drawer-header">
              <h2 id="create-campaign-title" className="drawer-title">Create new campaign</h2>
              <button className="close-btn" onClick={()=> setCreateOpen(false)} aria-label="Close">×</button>
            </div>
            <form className="drawer-body" onSubmit={handleCreate}>
              <div className="field">
                <label htmlFor="c-name">Name</label>
                <input id="c-name" type="text" value={cName} onChange={(e)=> setCName(e.target.value)} required placeholder="Campaign name" />
              </div>
              <div className="field">
                <label htmlFor="c-desc">Description</label>
                <input id="c-desc" type="text" value={cDesc} onChange={(e)=> setCDesc(e.target.value)} placeholder="Short description" />
              </div>
              <div className="field">
                <label htmlFor="c-platform">Platform</label>
                <select id="c-platform" value={cPlatform} onChange={(e)=> setCPlatform(e.target.value)}>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="TWITTER">Twitter</option>
                </select>
              </div>
              {createErr && <p style={{ color: '#ef4444', marginTop: 8 }}>{createErr}</p>}
            </form>
            <div className="drawer-footer">
              <button className="primary-btn btn-sm" type="button" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create campaign'}</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
