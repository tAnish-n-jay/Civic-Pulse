import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
const STATUS_COLORS = {
    reported: '#ef4444', acknowledged: '#f59e0b',
    in_progress: '#3b82f6', resolved: '#10b981', closed: '#6b7280'
}

function VerifyModal({ issue, onClose, onVerified, userId }) {
    const [outcome, setOutcome] = useState('resolved')
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit() {
        setSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('verified_by', userId)
            formData.append('outcome', outcome)
            formData.append('comment', comment)
            await axios.post(`${BACKEND_URL}/issues/${issue.id}/verify`, formData)
            onVerified(outcome)
            onClose()
        } catch (err) {
            alert(err.response?.data?.detail || 'Verification failed')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, minWidth: 380, color: '#f1f5f9' }}>
                <h3 style={{ marginBottom: 8 }}>✅ Verify Resolution</h3>
                <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
                    Was "<strong>{issue.title}</strong>" actually fixed?
                </p>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    {[
                        { value: 'resolved', label: '✅ Yes, Fixed!', color: '#10b981' },
                        { value: 'not_resolved', label: '❌ Not Fixed', color: '#ef4444' },
                    ].map(opt => (
                        <button key={opt.value} onClick={() => setOutcome(opt.value)} style={{
                            flex: 1, padding: 12, borderRadius: 10, border: `2px solid ${outcome === opt.value ? opt.color : '#334155'}`,
                            background: outcome === opt.value ? opt.color + '22' : '#0f172a',
                            color: outcome === opt.value ? opt.color : '#94a3b8',
                            cursor: 'pointer', fontWeight: 600
                        }}>
                            {opt.label}
                        </button>
                    ))}
                </div>

                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                    placeholder="Optional comment..."
                    style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', resize: 'none', boxSizing: 'border-box', marginBottom: 16 }} />

                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleSubmit} disabled={submitting} style={{
                        flex: 1, padding: 10, background: '#2563eb', color: '#fff',
                        border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600
                    }}>
                        {submitting ? 'Submitting...' : 'Submit Verification'}
                    </button>
                    <button onClick={onClose} style={{
                        flex: 1, padding: 10, background: '#334155', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer'
                    }}>Cancel</button>
                </div>
            </div>
        </div>
    )
}

export default function IssueDetail() {
    const { id } = useParams()
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const [issue, setIssue] = useState(null)
    const [updates, setUpdates] = useState([])
    const [showVerify, setShowVerify] = useState(false)
    const [verified, setVerified] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const [issueRes, updatesRes] = await Promise.all([
                    axios.get(`${BACKEND_URL}/issues/${id}`),
                    axios.get(`${BACKEND_URL}/issues/${id}/updates`)
                ])
                setIssue(issueRes.data)
                setUpdates(updatesRes.data.updates)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])

    if (loading) return <p style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Loading...</p>
    if (!issue) return <p style={{ color: '#ef4444', textAlign: 'center', padding: 40 }}>Issue not found.</p>

    return (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 24, color: '#f1f5f9' }}>
            {showVerify && (
                <VerifyModal issue={issue} userId={user.id}
                    onClose={() => setShowVerify(false)}
                    onVerified={(outcome) => setVerified(outcome)} />
            )}

            <button onClick={() => navigate('/')} style={{
                background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
                fontSize: 14, marginBottom: 16, padding: 0
            }}>← Back to Dashboard</button>

            {/* Issue Header */}
            <div style={{ background: '#1e293b', borderRadius: 16, padding: 24, marginBottom: 16, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{
                        background: '#f59e0b', color: '#000', padding: '2px 12px',
                        borderRadius: 20, fontSize: 12, fontWeight: 700
                    }}>{issue.category?.toUpperCase()}</span>
                    <span style={{
                        background: STATUS_COLORS[issue.status], color: '#fff',
                        padding: '2px 12px', borderRadius: 20, fontSize: 12
                    }}>{issue.status?.replace('_', ' ').toUpperCase()}</span>
                </div>

                <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>{issue.title}</h2>
                <p style={{ color: '#94a3b8', margin: '0 0 16px', fontSize: 14 }}>📍 {issue.location_text}</p>
                <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>{issue.description}</p>

                {issue.photo_url && (
                    <img src={issue.photo_url} alt="issue" style={{ width: '100%', borderRadius: 10, marginTop: 16, maxHeight: 300, objectFit: 'cover' }} />
                )}
            </div>

            {/* AI Analysis */}
            <div style={{ background: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 16, border: '1px solid #334155' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>🤖 AI Analysis</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                        { label: 'Severity', value: `${issue.severity}/5` },
                        { label: 'Impact Score', value: issue.impact_score },
                        { label: 'Department', value: issue.assigned_department },
                        { label: 'Upvotes', value: issue.upvotes },
                    ].map(item => (
                        <div key={item.label} style={{ background: '#0f172a', borderRadius: 10, padding: '10px 14px' }}>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.label}</div>
                            <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{item.value}</div>
                        </div>
                    ))}
                </div>
                {issue.ai_severity_reason && (
                    <p style={{ color: '#94a3b8', fontSize: 13, margin: '12px 0 0', fontStyle: 'italic' }}>
                        "{issue.ai_severity_reason}"
                    </p>
                )}
            </div>

            {/* Status Timeline */}
            <div style={{ background: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 16, border: '1px solid #334155' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>📋 Status Timeline</h3>
                {updates.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: 13 }}>No updates yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {updates.map((upd, i) => (
                            <div key={upd.id} style={{ display: 'flex', gap: 12 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{
                                        width: 12, height: 12, borderRadius: '50%',
                                        background: STATUS_COLORS[upd.new_status] || '#6b7280', marginTop: 4
                                    }} />
                                    {i < updates.length - 1 && <div style={{ width: 2, flex: 1, background: '#334155', margin: '4px 0' }} />}
                                </div>
                                <div style={{ flex: 1, paddingBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 600, fontSize: 13, color: STATUS_COLORS[upd.new_status] }}>
                                            {upd.new_status?.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <span style={{ fontSize: 11, color: '#64748b' }}>
                                            {new Date(upd.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {upd.note && <p style={{ color: '#cbd5e1', fontSize: 13, margin: '4px 0 0' }}>{upd.note}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Verify Button */}
            {issue.status === 'resolved' && profile?.role === 'citizen' && !verified && (
                <button onClick={() => setShowVerify(true)} style={{
                    width: '100%', padding: 14, background: '#10b981', color: '#fff',
                    border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 16, fontWeight: 700
                }}>
                    ✅ Verify Resolution — Was this actually fixed?
                </button>
            )}

            {verified && (
                <div style={{ background: verified === 'resolved' ? '#10b98122' : '#ef444422', borderRadius: 12, padding: 16, textAlign: 'center', border: `1px solid ${verified === 'resolved' ? '#10b981' : '#ef4444'}` }}>
                    <p style={{ color: verified === 'resolved' ? '#10b981' : '#ef4444', fontWeight: 700, margin: 0 }}>
                        {verified === 'resolved' ? '✅ You marked this as resolved!' : '❌ You marked this as NOT resolved'}
                    </p>
                </div>
            )}
        </div>
    )
}