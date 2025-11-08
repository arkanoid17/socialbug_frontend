import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

export default function Shell({ children }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const btnRef = useRef(null)

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuOpen) return
      const m = menuRef.current
      const b = btnRef.current
      if (m && !m.contains(e.target) && b && !b.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  const logout = () => {
    localStorage.removeItem('token')
    // Hard reload to clear any in-memory state and route guards
    window.location.reload()
  }

  return (
    <div className="page">
      <header className="toolbar">
        <div className="toolbar-left">
          <span className="brand-mark">socialbug</span>
        </div>
        <div className="toolbar-right">
          <button
            className="avatar-btn"
            ref={btnRef}
            aria-label="User menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg className="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21a8 8 0 0 0-16 0"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="menu" ref={menuRef} role="menu">
              <button className="menu-item" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/profile') }}>Profile</button>
              <button className="menu-item danger" role="menuitem" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </header>

      <div className="shell-body">
        <aside className="sidebar">
          <nav className="nav">
            <NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Dashboard</NavLink>
            <NavLink to="/connections" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Connections</NavLink>
            <NavLink to="/generate" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Generate</NavLink>
            <NavLink to="/posts" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Posts</NavLink>
          </nav>
        </aside>

        <main className="content">
          {children}
        </main>
      </div>
    </div>
  )
}
