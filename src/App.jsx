import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Auth from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Connections from './pages/Connections.jsx'
import Generate from './pages/Generate.jsx'
import Posts from './pages/Posts.jsx'
import Profile from './pages/Profile.jsx'
import CampaignItems from './pages/CampaignItems.jsx'
import PostInsights from './pages/PostInsights.jsx'

const isAuthed = () => Boolean(localStorage.getItem('token'))

function App() {
  return (
    <Routes>
      <Route path="/" element={isAuthed() ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/dashboard" element={isAuthed() ? <Dashboard /> : <Navigate to="/" replace />} />
      <Route path="/connections" element={isAuthed() ? <Connections /> : <Navigate to="/" replace />} />
      <Route path="/generate" element={isAuthed() ? <Generate /> : <Navigate to="/" replace />} />
      <Route path="/posts" element={isAuthed() ? <Posts /> : <Navigate to="/" replace />} />
      <Route path="/profile" element={isAuthed() ? <Profile /> : <Navigate to="/" replace />} />
      <Route path="/campaigns/:campaignId/items" element={isAuthed() ? <CampaignItems /> : <Navigate to="/" replace />} />
      <Route path="/posts/:providerPostId/insights" element={isAuthed() ? <PostInsights /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
