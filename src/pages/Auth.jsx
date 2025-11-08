import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../api'
import '../App.css'

export default function Auth() {
  const [activeTab, setActiveTab] = useState('login')
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <div className="logo-circle">SB</div>
          <div className="brand-text">
            <h1 className="brand-title">SocialBug</h1>
            <p className="brand-subtitle">Sign in to continue</p>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => setActiveTab('login')} type="button">Login</button>
          <button className={`tab ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')} type="button">Register</button>
        </div>

        {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}

        <p className="disclaimer">By continuing you agree to our Terms and Privacy Policy.</p>
      </div>
    </div>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = await login({ email, password })
      localStorage.setItem('token', token)
      // Reload to ensure app-level auth guards and initial data load run
      window.location.reload()
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      {error && <p style={{ color: '#ef4444', marginTop: 8 }}>{error}</p>}
      <button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
    </form>
  )
}

function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = await register({ name, email, password })
      localStorage.setItem('token', token)
      window.location.reload()
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="reg-name">Name</label>
        <input id="reg-name" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="reg-email">Email</label>
        <input id="reg-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="reg-password">Password</label>
        <input id="reg-password" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
      </div>
      {error && <p style={{ color: '#ef4444', marginTop: 8 }}>{error}</p>}
      <button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
    </form>
  )
}
