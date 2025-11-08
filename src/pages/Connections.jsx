import { useEffect, useRef, useState } from 'react'
import Shell from '../shared/Shell'
import { authorizeConnection, completeConnection, fetchActiveConnections, disconnectConnection } from '../api'

export default function Connections() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [items, setItems] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState('')
  const [menuFor, setMenuFor] = useState(null)
  const [confirmFor, setConfirmFor] = useState(null)
  const [disconnectingId, setDisconnectingId] = useState(null)
  const [toast, setToast] = useState({ msg: '', type: 'info' })
  const toastTimer = useRef(null)
  const modalRef = useRef(null)

  const showToast = (msg, type = 'info', ms = 2200) => {
    setToast({ msg, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast({ msg: '', type }), ms)
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); setConfirmFor(null) } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const closeMenus = (e) => {
      const t = e.target
      if (!(t.closest && (t.closest('.row-actions') || t.closest('.row-menu')))) {
        setMenuFor(null)
      }
    }
    document.addEventListener('mousedown', closeMenus)
    return () => document.removeEventListener('mousedown', closeMenus)
  }, [])

  const loadConnections = async () => {
    try {
      setLoadingList(true)
      setListError('')
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')
      const content = await fetchActiveConnections(token)
      setItems(content)
    } catch (err) {
      setListError(err.message || 'Failed to load connections')
      showToast(err.message || 'Failed to load connections', 'error')
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => { loadConnections() }, [])

  // Handle callback: if ?code= present, complete the connection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) return
    const provider = localStorage.getItem('connection_provider')
    const token = localStorage.getItem('token')
    if (!provider || !token) return
    ;(async () => {
      try {
        setStatus('Finalizing connection...')
        await completeConnection(provider, code, token, `${window.location.origin}/connections`)
        setStatus('Connection completed.')
        await loadConnections()
        showToast('Connection completed', 'success')
      } catch (err) {
        console.error(err)
        setStatus(err.message || 'Failed to complete connection')
        showToast(err.message || 'Failed to complete connection', 'error')
      } finally {
        // Clean up the URL to remove the code param
        const url = new URL(window.location.href)
        url.searchParams.delete('code')
        window.history.replaceState({}, '', url)
      }
    })()
  }, [])

  const onBackdropClick = (e) => {
    if (e.target.classList.contains('modal-backdrop')) { setOpen(false); setConfirmFor(null) }
  }

  const startAuthorize = async (platform) => {
    try {
      setOpen(false)
      localStorage.setItem('connection_provider', platform)
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')
      setStatus('Redirecting to authorize...')
      const { url } = await authorizeConnection(platform, `${window.location.origin}/connections`, token)
      if (!url) throw new Error('No authorization URL returned')
      window.location.href = url
    } catch (err) {
      console.error(err)
      setStatus(err.message || 'Failed to start authorization')
      showToast(err.message || 'Failed to start authorization', 'error')
    }
  }

  return (
    <Shell>
      <div className="connections">
        <div className="connections-head">
          <h1>Connections</h1>
          <div className="actions">
            <button className="primary-btn btn-sm" onClick={() => setOpen(true)}>Add New</button>
          </div>
        </div>

        {status && <p style={{ opacity: 0.8, marginBottom: 8 }}>{status}</p>}
        {loadingList && <p style={{ opacity: 0.7 }}>Loading...</p>}
        {listError && <p style={{ color: '#ef4444' }}>{listError}</p>}
        {!loadingList && !listError && (
          <div className="conn-list">
            {items.length === 0 ? (
              <div className="empty">No active connections. Click "Add New" to connect an account.</div>
            ) : (
              items.map((it) => (
                <div key={it.id} className="conn-row">
                  <div className="conn-avatar">
                    {it.profilePictureUrl ? (
                      <img src={it.profilePictureUrl} alt={it.username || it.displayName || 'avatar'} onError={(e)=>{ e.currentTarget.style.display='none' }} />
                    ) : null}
                    <svg className="ph" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 21a8 8 0 0 0-16 0"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>

                  <div className="conn-main">
                    <div className="conn-title-line">
                      <span className="conn-title">{it.displayName || it.username}</span>
                      <span className="badge platform">{it.platform}</span>
                    </div>
                    <div className="conn-sub">@{it.username}</div>
                  </div>

                  <div className="conn-meta">
                    <span className={`status-chip ${String(it.status||'').toLowerCase()}`}>{it.status}</span>
                    {it.expiresAt && <span className="muted">exp: {new Date(it.expiresAt).toLocaleDateString()}</span>}
                  </div>

                  <div className="row-actions">
                    <button className="menu-btn" aria-label="More" aria-haspopup="menu" aria-expanded={menuFor===it.id} onClick={()=> setMenuFor(menuFor===it.id?null:it.id)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <circle cx="12" cy="5" r="2"/>
                        <circle cx="12" cy="12" r="2"/>
                        <circle cx="12" cy="19" r="2"/>
                      </svg>
                    </button>
                    {menuFor===it.id && (
                      <div className="menu row-menu" role="menu">
                        <button
                          className="menu-item danger"
                          role="menuitem"
                          onClick={() => { setMenuFor(null); setConfirmFor(it.id) }}
                        >Disconnect</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={onBackdropClick}>
          <div className="modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="add-conn-title">
            <div className="modal-header">
              <h2 id="add-conn-title" className="modal-title">Add a new connection</h2>
              <button className="close-btn" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="option-grid">
              <button className="option-card instagram" onClick={() => startAuthorize('INSTAGRAM')}>
                <div className="option-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="5"/>
                    <circle cx="12" cy="12" r="4"/>
                    <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>
                  </svg>
                </div>
                <div className="option-body">
                  <div className="option-title">Instagram</div>
                  <div className="option-sub">Connect your Instagram account</div>
                </div>
              </button>

              <button className="option-card linkedin" onClick={() => startAuthorize('LINKEDIN')}>
                <div className="option-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <path d="M8 10v7M8 7.5v.01M12 17v-4a2 2 0 0 1 4 0v4"/>
                  </svg>
                </div>
                <div className="option-body">
                  <div className="option-title">LinkedIn</div>
                  <div className="option-sub">Connect your LinkedIn profile</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmFor !== null && (() => { const it = items.find(x=>x.id===confirmFor); if (!it) return null; return (
        <div className="modal-backdrop" onClick={onBackdropClick}>
          <div className="modal confirm" role="dialog" aria-modal="true" aria-labelledby="disc-title">
            <div className="modal-header">
              <h2 id="disc-title" className="modal-title">Disconnect account?</h2>
              <button className="close-btn" onClick={() => setConfirmFor(null)} aria-label="Close">×</button>
            </div>
            <p style={{ marginTop: 0 }}>Are you sure you want to disconnect {it.displayName || ('@'+it.username)}?</p>
            <div className="modal-actions">
              <button
                className="primary-btn"
                disabled={disconnectingId===it.id}
                onClick={async()=>{
                  try {
                    setDisconnectingId(it.id)
                    const token = localStorage.getItem('token')
                    if (!token) throw new Error('Not authenticated')
                    await disconnectConnection(it.id, token)
                    setConfirmFor(null)
                    await loadConnections()
                    showToast('Disconnected', 'success')
                  } catch(err) {
                    showToast(err.message || 'Failed to disconnect', 'error')
                  } finally {
                    setDisconnectingId(null)
                  }
                }}
              >
                {disconnectingId===it.id ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      ) })()}

      {toast.msg && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </Shell>
  )
}
