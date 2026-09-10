import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const STATUS_PIPELINE = ['reported', 'acknowledged', 'in_progress', 'resolved']
const STATUS_COLORS = {
  reported: '#ef4444',
  acknowledged: '#f59e0b',
  in_progress: '#3b82f6',
  resolved: '#10b981',
  closed: '#6b7280',
}

function StatusUpdateModal({ issue, onClose, onUpdated }) {
  const [newStatus, setNewStatus] = useState(issue.status)
  const [note, setNote] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleDraft() {
    setDrafting(true)
    try {
      const res = await api.get(`/issues/${issue.id}/draft-update`)
      setNote(res.data.draft)
    } catch {
      setNote('Unable to generate draft. Please write manually.')
    } finally {
      setDrafting(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('new_status', newStatus)
      formData.append('note', note)
      await api.post(`/issues/${issue.id}/status`, formData)
      onUpdated(issue.id, newStatus)
      onClose()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status')
    } finally {
      setSubmitting(false)
    }
  }

  const currentIdx = STATUS_PIPELINE.indexOf(issue.status)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, minWidth: 420, maxWidth: 520, color: '#f1f5f9' }}>
        <h3 style={{ marginBottom: 8 }}>Update Status</h3>
        <p style={{ color: '#94a3b8', marginBottom: 20, fontSize: 14 }}>{issue.title}</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {STATUS_PIPELINE.map((s, i) => (
            <button key={s} onClick={() => setNewStatus(s)}
              disabled={i < currentIdx}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                background: newStatus === s ? STATUS_COLORS[s] : i < currentIdx ? '#0f172a' : '#334155',
                color: '#fff', fontSize: 11, fontWeight: 600, cursor: i < currentIdx ? 'not-allowed' : 'pointer',
                opacity: i < currentIdx ? 0.4 : 1
              }}>
              {s.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ fontSize: 13 }}>Update Note for Citizens</label>
            <button onClick={handleDraft} disabled={drafting}
              style={{ fontSize: 12, padding: '4px 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {drafting ? '✨ Generating...' : '✨ AI Draft'}
            </button>
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
            placeholder="Write a note for citizens about this update..."
            style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ flex: 1, padding: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {submitting ? 'Updating...' : 'Submit Update'}
          </button>
          <button onClick={onClose}
            style={{ flex: 1, padding: 10, background: '#334155', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function AuthorityIssueCard({ issue, onUpdate }) {
  const [showModal, setShowModal] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(issue.status)

  function handleUpdated(id, newStatus) {
    setCurrentStatus(newStatus)
    onUpdate(id, newStatus)
  }

  return (
    <>
      {showModal && (
        <StatusUpdateModal
          issue={{ ...issue, status: currentStatus }}
          onClose={() => setShowModal(false)}
          onUpdated={handleUpdated}
        />
      )}
      <div style={{
        background: '#1e293b', borderRadius: 16, padding: 20,
        border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 12
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#f1f5f9', margin: '0 0 4px', fontSize: 16 }}>{issue.title}</h3>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: 13 }}>📍 {issue.location_text}</p>
            <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: 13 }}>🏢 {issue.assigned_department}</p>
          </div>
          <div style={{ background: '#f59e0b', color: '#000', borderRadius: 12, padding: '6px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{issue.impact_score}</div>
            <div style={{ fontSize: 10, fontWeight: 600 }}>IMPACT</div>
          </div>
        </div>

        {issue.ai_summary && (
          <p style={{ color: '#cbd5e1', fontSize: 13, margin: 0, fontStyle: 'italic' }}>🤖 {issue.ai_summary}</p>
        )}

        <div style={{ display: 'flex', gap: 4 }}>
          {STATUS_PIPELINE.map((s, i) => {
            const currentIdx = STATUS_PIPELINE.indexOf(currentStatus)
            return (
              <div key={s} style={{
                flex: 1, height: 6, borderRadius: 3,
                background: i <= currentIdx ? STATUS_COLORS[s] : '#334155'
              }} />
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            background: STATUS_COLORS[currentStatus] || '#6b7280',
            color: '#fff', padding: '3px 12px', borderRadius: 20, fontSize: 12
          }}>
            {currentStatus?.replace('_', ' ').toUpperCase()}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>👍 {issue.upvotes} upvotes</span>
            {currentStatus !== 'resolved' && currentStatus !== 'closed' && (
              <button onClick={() => setShowModal(true)}
                style={{ padding: '6px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>
                Update Status
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function AuthorityDashboard() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile && !['authority', 'representative'].includes(profile.role)) {
      navigate('/')
      return
    }
    if (user) fetchIssues()
  }, [user, profile])

  async function fetchIssues() {
    try {
      const res = await api.get('/issues/authority/issues')
      setIssues(res.data.issues)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleUpdate(issueId, newStatus) {
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: newStatus } : i))
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, color: '#f1f5f9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>🏛️ Authority Panel</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
            {profile?.name} · {profile?.department || 'No department set'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/')}
            style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Citizen View
          </button>
          <button onClick={logout}
            style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Assigned', value: issues.length },
          { label: 'In Progress', value: issues.filter(i => i.status === 'in_progress').length },
          { label: 'Resolved', value: issues.filter(i => i.status === 'resolved').length },
          { label: 'Pending', value: issues.filter(i => ['reported', 'acknowledged'].includes(i.status)).length },
        ].map(stat => (
          <div key={stat.label} style={{ flex: 1, background: '#1e293b', borderRadius: 12, padding: '12px 16px', textAlign: 'center', border: '1px solid #334155' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading your queue...</p>
      ) : issues.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8' }}>No issues assigned to you yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {issues.map(issue => (
            <AuthorityIssueCard key={issue.id} issue={issue} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}