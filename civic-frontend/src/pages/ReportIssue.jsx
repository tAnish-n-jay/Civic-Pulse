import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

export default function ReportIssue() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ title: '', description: '', location_text: '' })
  const [photo, setPhoto] = useState(null)
  const [location, setLocation] = useState({ latitude: null, longitude: null })
  const [aiPreview, setAiPreview] = useState(null)   // AI result before confirm
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function getLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => alert('Could not get location. You can still submit without it.')
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('title', form.title)
    formData.append('description', form.description)
    formData.append('location_text', form.location_text)
    formData.append('reported_by', user.id)
    if (location.latitude) formData.append('latitude', location.latitude)
    if (location.longitude) formData.append('longitude', location.longitude)
    if (photo) formData.append('photo', photo)

    try {
      const res = await axios.post(`${BACKEND_URL}/issues/`, formData)
      setAiPreview(res.data)  // Show AI analysis preview
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    setSubmitted(true)
    setTimeout(() => navigate('/'), 2000)
  }

  // ── AI Preview Screen ──
  if (aiPreview) {
    const { ai_analysis, impact_score, issue } = aiPreview
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', padding: 24 }}>
        <h2>🤖 AI Analysis</h2>
        <div style={{ background: '#f0f4ff', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <p><strong>Category:</strong> {ai_analysis.category}</p>
          <p><strong>Severity:</strong> {ai_analysis.severity} / 5</p>
          <p><strong>Reason:</strong> {ai_analysis.severity_reason}</p>
          <p><strong>Assigned To:</strong> {ai_analysis.assigned_department}</p>
          <p><strong>Impact:</strong> {ai_analysis.impact_summary}</p>
          <p><strong>Impact Score:</strong> {impact_score}</p>
        </div>

        {submitted ? (
          <p style={{ color: 'green' }}>✅ Issue confirmed! Redirecting...</p>
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleConfirm} style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}>
              ✅ Confirm & Submit
            </button>
            <button onClick={() => setAiPreview(null)} style={{ padding: '10px 24px', border: '1px solid #ccc', borderRadius: 8 }}>
              ✏️ Edit
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Report Form ──
  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 24 }}>
      <h2>Report a Civic Issue</h2>
      <form onSubmit={handleSubmit}>
        <label>Title</label>
        <input name="title" value={form.title} onChange={handleChange} required
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }} />

        <label>Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} required rows={4}
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }} />

        <label>Area / Landmark</label>
        <input name="location_text" value={form.location_text} onChange={handleChange}
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }} />

        <button type="button" onClick={getLocation} style={{ marginBottom: 12, padding: '6px 16px' }}>
          📍 {location.latitude ? `Got location (${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)})` : 'Get My Location'}
        </button>

        <br />
        <label>Photo (optional)</label>
        <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])}
          style={{ display: 'block', marginBottom: 16 }} />

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading}
          style={{ padding: '10px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}>
          {loading ? '🔍 AI is analyzing...' : 'Submit Issue'}
        </button>
      </form>
    </div>
  )
}