import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Shell from '../shared/Shell'
import { fetchActiveConnections } from '../api'

const BASE_URL = 'http://localhost:8081'

function formatDate(iso) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}
function toZDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return ''
  const dt = new Date(`${dateStr}T${timeStr}`)
  return dt.toISOString()
}

export default function CampaignItems() {
  const { campaignId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const nameFromState = location.state && location.state.name
  const statusFromState = location.state && location.state.status
  const platformsFromState = (location.state && location.state.platforms) || []

  const [name, setName] = useState(nameFromState || '')
  const [status, setStatus] = useState(statusFromState || '')
  const [platforms, setPlatforms] = useState(platformsFromState || [])

  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Create item drawer state
  const [open, setOpen] = useState(false)
  const [iPlatform, setIPlatform] = useState(platforms[0] || 'INSTAGRAM')
  const [iType, setIType] = useState('POST')
  const [iFile, setIFile] = useState(null)
  const [iCaption, setICaption] = useState('')
  const [iHashtags, setIHashtags] = useState('')
  const [iDate, setIDate] = useState('')
  const [iTime, setITime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState('')

  // Accounts (connections)
  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsError, setAccountsError] = useState('')
  const [iConnectionId, setIConnectionId] = useState('')

  const token = useMemo(() => localStorage.getItem('token') ?? '', [])

  useEffect(() => {
    // If name/status not passed, keep empty; could fetch extra details if needed
    if (!nameFromState) setName('')
    if (!statusFromState) setStatus('')
    if ((platformsFromState || []).length > 0) setPlatforms(platformsFromState)
  }, [nameFromState, statusFromState, platformsFromState])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    async function fetchItems() {
      setLoading(true)
      setError('')
      try {
        if (!token) throw new Error('Not authenticated')
        const params = new URLSearchParams({
          page: String(page),
          size: String(size),
          sort: 'createdAt,desc',
        })
        const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/items?${params.toString()}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || res.statusText)
        }
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load items')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchItems()
    return () => { cancelled = true; controller.abort() }
  }, [campaignId, page, size, token, refreshKey])

  // Load accounts when drawer opens
  useEffect(() => {
    let mounted = true
    async function load() {
      if (!open) return
      try {
        setAccountsLoading(true)
        setAccountsError('')
        const list = await fetchActiveConnections(token)
        if (!mounted) return
        setAccounts(list)
        // preselect by platform if possible
        const first = list.find(a => String(a.platform).toUpperCase() === String(iPlatform).toUpperCase())
        setIConnectionId(first ? String(first.id) : (list[0] ? String(list[0].id) : ''))
      } catch (e) {
        if (mounted) setAccountsError(e?.message || 'Failed to load accounts')
      } finally {
        if (mounted) setAccountsLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [open, token, iPlatform])

  // When platform changes, adjust type and default account
  useEffect(() => {
    const opts = typeOptionsFor(iPlatform)
    if (!opts.includes(iType)) setIType(opts[0])
    const match = accounts.find(a => String(a.platform).toUpperCase() === String(iPlatform).toUpperCase())
    if (match) setIConnectionId(String(match.id))
  }, [iPlatform])

  function nextPage() { if (data && !data.last) setPage((p) => p + 1) }
  function prevPage() { if (data && !data.first) setPage((p) => Math.max(0, p - 1)) }

  // Types based on platform to match backend rules
  function typeOptionsFor(platform) {
    const p = String(platform).toUpperCase()
    if (p === 'INSTAGRAM') return ['POST', 'STORY']
    if (p === 'LINKEDIN') return ['TEXT', 'POST']
    if (p === 'TWITTER') return ['POST']
    return ['POST']
  }

  async function handleSubmitItem(e) {
    e?.preventDefault?.()
    setSubmitErr('')
    try {
      if (!token) throw new Error('Not authenticated')
      if (!iPlatform || !iType || !iFile || !iCaption || !iHashtags || !iDate || !iTime) {
        throw new Error('All fields are required')
      }
      setSubmitting(true)

      // 1) Upload image
      const fd = new FormData()
      fd.append('image', iFile)
      const upRes = await fetch(`${BASE_URL}/api/files/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!upRes.ok) {
        const txt = await upRes.text()
        throw new Error(txt || 'Upload failed')
      }
      const upJson = await upRes.json()
      const url = upJson.url
      if (!url) throw new Error('No URL returned from upload')

      // 2) Create item
      const isoScheduled = toZDateTime(iDate, iTime)
      const hashtags = iHashtags.trim().length ? iHashtags.trim().split(/\s+/) : []
      const payload = {
        platform: iPlatform,
        type: iType,
        imageUrl: url,
        caption: iCaption,
        hashtags,
        status: 'PENDING',
        scheduledUploadAt: isoScheduled,
        connectionId: iConnectionId ? Number(iConnectionId) : undefined,
      }
      if (!payload.connectionId) throw new Error('Please select an account')

      const createUrls = [
        `${BASE_URL}/api/campaigns/${campaignId}/items`,
        `${BASE_URL}/api/campaigns/${campaignId}/items/create`,
      ]
      let created = false
      for (const u of createUrls) {
        const cr = await fetch(u, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
        if (cr.ok) { created = true; break }
        if (cr.status !== 404) {
          const t = await cr.text()
          throw new Error(t || 'Create failed')
        }
      }
      if (!created) throw new Error('Create endpoint not found')

      // Success: close drawer and refresh
      setOpen(false)
      setIPlatform(platforms[0] || 'INSTAGRAM')
      setIType('POST')
      setIFile(null)
      setICaption('')
      setIHashtags('')
      setIDate('')
      setITime('')
      setRefreshKey((k) => k + 1)
      setPage(0)
    } catch (err) {
      setSubmitErr(err.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Shell>
      <div className="connections-head" style={{ marginBottom: 8 }}>
        <div>
          <div className="muted" style={{ marginBottom: 6 }}>
            <a className="nav-link" style={{ padding: '2px 6px' }} onClick={(e)=>{ e.preventDefault(); navigate('/generate') }} href="/generate">Campaigns</a>
            <span> &gt; </span>
            <span>{name || `Campaign #${campaignId}`}</span>
            <span> &nbsp;&gt;&nbsp; Items</span>
          </div>
          <h1 style={{ margin: 0 }}>Items</h1>
        </div>
        <div className="actions">
          {String(status).toUpperCase() === 'ACTIVE' && (
            <button className="primary-btn btn-sm" type="button" onClick={() => setOpen(true)}>
              Add Item
            </button>
          )}
        </div>
      </div>

      {loading && <div className="muted">Loading…</div>}
      {error && <div style={{ color: '#ef4444' }}>{error}</div>}

      {!loading && !error && (
        <>
          <table className="table" role="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Platform</th>
                <th>Type</th>
                <th>Caption</th>
                <th>Hashtags</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {(data?.content ?? []).map((it) => (
                <tr key={it.id}>
                  <td>{it.id}</td>
                  <td>
                    <span className={`badge pill ${String(it.platform).toLowerCase()}`}>{it.platform}</span>
                  </td>
                  <td>
                    <span className="badge pill">{it.type}</span>
                  </td>
                  <td className="cell-muted" title={it.caption || ''}>
                    {(it.caption || '-').length > 60 ? (it.caption || '-').slice(0, 60) + '…' : (it.caption || '-')}
                  </td>
                  <td>
                    <div className="platforms">
                      {(it.hashtags || []).map((h) => (
                        <span key={h} className="badge pill">{h}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`status-chip ${String(it.status||'').toLowerCase()}`}>{it.status}</span>
                  </td>
                  <td className="cell-muted">{it.scheduledUploadAt ? formatDate(it.scheduledUploadAt) : '-'}</td>
                  <td className="cell-muted">{formatDate(it.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && data.content.length === 0 && (
            <div className="muted" style={{ padding: 12 }}>No items found</div>
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

      {open && (
        <div className="drawer-backdrop" onClick={(e)=>{ if (e.target.classList.contains('drawer-backdrop')) setOpen(false) }}>
          <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="add-item-title">
            <div className="drawer-header">
              <h2 id="add-item-title" className="drawer-title">Add campaign item</h2>
              <button className="close-btn" onClick={()=> setOpen(false)} aria-label="Close">×</button>
            </div>
            <form className="drawer-body" onSubmit={handleSubmitItem}>
              <div className="field">
                <label htmlFor="i-platform">Platform</label>
                <select id="i-platform" value={iPlatform} onChange={(e)=> { setIPlatform(e.target.value); const opts = typeOptionsFor(e.target.value); if (!opts.includes(iType)) setIType(opts[0]) }} required>
                  {(platforms.length ? platforms : ['INSTAGRAM','LINKEDIN','TWITTER']).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="i-type">Type</label>
                <select id="i-type" value={iType} onChange={(e)=> setIType(e.target.value)} required>
                  {typeOptionsFor(iPlatform).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="i-account">Account</label>
                <select id="i-account" value={iConnectionId} onChange={(e)=> setIConnectionId(e.target.value)} required>
                  {accountsLoading && <option value="">Loading...</option>}
                  {!accountsLoading && accounts.filter(a => String(a.platform).toUpperCase() === String(iPlatform).toUpperCase()).map((a) => (
                    <option key={a.id} value={a.id}>{a.displayName || a.username || a.externalUserId} · {a.platform}</option>
                  ))}
                </select>
                {accountsError && <span className="muted" style={{ color: '#ef4444' }}>{accountsError}</span>}
              </div>

              <div className="field">
                <label htmlFor="i-file">Image</label>
                <input id="i-file" type="file" accept="image/*" onChange={(e)=> setIFile(e.target.files && e.target.files[0])} required />
              </div>

              <div className="field">
                <label htmlFor="i-caption">Caption</label>
                <input id="i-caption" type="text" value={iCaption} onChange={(e)=> setICaption(e.target.value)} required placeholder="Write a caption" />
              </div>

              <div className="field">
                <label htmlFor="i-hashtags">Hashtags</label>
                <input id="i-hashtags" type="text" value={iHashtags} onChange={(e)=> setIHashtags(e.target.value)} required placeholder="#tag1 #tag2" />
              </div>

              <div className="field">
                <label htmlFor="i-date">Upload date</label>
                <input id="i-date" type="date" value={iDate} onChange={(e)=> setIDate(e.target.value)} required />
              </div>

              <div className="field">
                <label htmlFor="i-time">Upload time</label>
                <input id="i-time" type="time" value={iTime} onChange={(e)=> setITime(e.target.value)} required />
              </div>

              {submitErr && <p style={{ color: '#ef4444', marginTop: 8 }}>{submitErr}</p>}
            </form>
            <div className="drawer-footer">
              <button className="primary-btn btn-sm" type="button" onClick={handleSubmitItem} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
