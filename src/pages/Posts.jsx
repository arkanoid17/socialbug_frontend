import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../shared/Shell'

const BASE_URL = 'http://localhost:8081'

export default function Posts() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [last, setLast] = useState(false)

  // Insights modal state
  const [insOpen, setInsOpen] = useState(false)
  const [insPost, setInsPost] = useState(null)
  const [insLoading, setInsLoading] = useState(false)
  const [insError, setInsError] = useState('')
  const [insData, setInsData] = useState([])

  const token = useMemo(() => localStorage.getItem('token') ?? '', [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    async function fetchPosts() {
      setLoading(true)
      setError('')
      try {
        if (!token) throw new Error('Not authenticated')
        const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' })
        const res = await fetch(`${BASE_URL}/api/posts?${params.toString()}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || res.statusText)
        }
        const json = await res.json()
        if (!cancelled) {
          setItems((prev) => page === 0 ? (json.content || []) : [...prev, ...(json.content || [])])
          setLast(Boolean(json.last))
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load posts')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchPosts()
    return () => { cancelled = true; controller.abort() }
  }, [page, size, token])

  // Infinite scroll
  useEffect(() => {
    const sentinel = document.getElementById('post-sentinel')
    if (!sentinel) return
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && !loading && !last) {
        setPage((p) => p + 1)
      }
    }, { rootMargin: '200px' })
    io.observe(sentinel)
    return () => io.disconnect()
  }, [loading, last])

  function openInsights(post) {
    // Navigate to dedicated insights page with post info in state
    navigate(`/posts/${encodeURIComponent(post.providerPostId)}/insights`, { state: { post } })
  }
  function closeInsights() { setInsOpen(false); setInsPost(null); setInsData([]); setInsError('') }

  return (
    <Shell>
      <div className="connections-head" style={{ marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Posts</h1>
        <div className="actions"></div>
      </div>

      {loading && <div className="muted">Loading…</div>}
      {error && <div style={{ color: '#ef4444' }}>{error}</div>}

      {!error && (
        <>
          <div className="post-grid">
            {items.map((p) => (
              <div key={p.id} className="post-card" onClick={() => openInsights(p)} style={{ cursor: 'pointer' }} title="View insights">
                <img className="post-img" src={p.imageUrl} alt={p.caption || `post-${p.id}`} onError={(e)=>{ e.currentTarget.style.visibility='hidden' }} />
                <div className="post-cap" title={p.caption || ''}>
                  <span className="post-cap-text">{(p.caption || '-').length > 60 ? (p.caption || '-').slice(0, 60) + '…' : (p.caption || '-')}</span>
                </div>
              </div>
            ))}
          </div>

          {!loading && items.length === 0 && (
            <div className="muted" style={{ padding: 12 }}>No posts yet</div>
          )}

          <div id="post-sentinel" style={{ height: 1 }} />
          {loading && <div className="muted" style={{ padding: 8 }}>Loading…</div>}

          {/* insights modal removed in favor of dedicated page */}
          {false && (
            <div className="modal-backdrop" onClick={(e)=>{ if (e.target.classList.contains('modal-backdrop')) closeInsights() }}>
              <div className="modal" role="dialog" aria-modal="true" aria-labelledby="insights-title">
                <div className="modal-header">
                  <h2 id="insights-title" className="modal-title">Insights</h2>
                  <button className="close-btn" onClick={closeInsights} aria-label="Close">×</button>
                </div>
                {insLoading && <div className="muted">Loading insights…</div>}
                {insError && <div style={{ color: '#ef4444' }}>{insError}</div>}
                {!insLoading && !insError && (
                  <div className="kpi-grid">
                    {insData.map((d) => {
                      const val = Array.isArray(d.values) && d.values[0] ? d.values[0].value : '-'
                      return (
                        <div key={d.id || d.name} className="kpi-card">
                          <div className="kpi-title">{d.title || d.name}</div>
                          <div className="kpi-value">{String(val)}</div>
                          {d.description && <div className="kpi-desc">{d.description}</div>}
                        </div>
                      )
                    })}
                    {insData.length === 0 && (
                      <div className="muted">No insights available.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  )
}
