import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Shell from '../shared/Shell'

const BASE_URL = 'http://localhost:8081'

function parseHashtags(caption) {
  if (!caption) return []
  const matches = caption.match(/#[A-Za-z0-9_]+/g)
  return matches || []
}

export default function PostInsights() {
  const { providerPostId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const postFromState = location.state && location.state.post // not used (we navigated via assignment), fallback to query later if needed

  const [post, setPost] = useState(postFromState || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [insLoading, setInsLoading] = useState(false)
  const [insError, setInsError] = useState('')
  const [insData, setInsData] = useState([])

  const token = useMemo(() => localStorage.getItem('token') ?? '', [])

  // For now, we rely on navigation state for post info; if missing, user came directly – we could fetch /api/posts and find the one with providerPostId, but API has no filter.
  useEffect(() => {
    // noop for post; assume comes from navigation
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadInsights() {
      setInsLoading(true)
      setInsError('')
      try {
        const res = await fetch(`${BASE_URL}/api/instagram/insights/${encodeURIComponent(providerPostId)}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error((await res.text()) || 'Failed to fetch insights')
        const json = await res.json()
        if (!cancelled) setInsData(Array.isArray(json?.data) ? json.data : [])
      } catch (e) {
        if (!cancelled) setInsError(e?.message || 'Failed to fetch insights')
      } finally {
        if (!cancelled) setInsLoading(false)
      }
    }
    loadInsights()
    return () => { cancelled = true }
  }, [providerPostId, token])

  const caption = post?.caption || '(caption not available)'
  const imageUrl = post?.imageUrl || ''
  const hashtags = parseHashtags(post?.caption)

  return (
    <Shell>
      <div className="connections-head" style={{ marginBottom: 8 }}>
        <div>
          <div className="muted" style={{ marginBottom: 6 }}>
            <a className="nav-link" style={{ padding: '2px 6px' }} href="/posts" onClick={(e)=>{ e.preventDefault(); navigate('/posts') }}>Posts</a>
            <span> &gt; </span>
            <span title={caption}>{(caption || '-').length > 40 ? (caption || '-').slice(0, 40) + '…' : (caption || '-')}</span>
            <span> &nbsp;&gt;&nbsp; Insights</span>
          </div>
          <h1 style={{ margin: 0 }}>Insights</h1>
        </div>
        <div className="actions"></div>
      </div>

      {error && <div style={{ color: '#ef4444' }}>{error}</div>}

      <div className="insights-layout">
        {/* Left: 2/5 width - Post details */}
        <div className="detail-card">
          {imageUrl ? (
            <img className="detail-img" src={imageUrl} alt="post" onError={(e)=>{ e.currentTarget.style.display='none' }} />
          ) : (
            <div className="muted" style={{ padding: 12 }}>No image</div>
          )}
          <div className="detail-body">
            <div className="detail-caption" title={caption}>{caption}</div>
            <div className="platforms">
              {(hashtags.length ? hashtags : parseHashtags(caption)).map((h) => (
                <span key={h} className="badge pill">{h}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: 3/5 width - KPIs */}
        <div>
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
    </Shell>
  )
}
