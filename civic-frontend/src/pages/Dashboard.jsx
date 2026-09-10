import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

const CATEGORY_COLORS = {
    pothole: '#f59e0b',
    sewage: '#10b981',
    streetlight: '#3b82f6',
    garbage: '#8b5cf6',
    water: '#06b6d4',
    infrastructure: '#6b7280',
}

const STATUS_COLORS = {
    reported: '#ef4444',
    acknowledged: '#f59e0b',
    in_progress: '#3b82f6',
    resolved: '#10b981',
    closed: '#6b7280',
}

function ScoreBreakdown({ issue, onClose }) {
    const severity = issue.severity * 20
    const upvoteScore = issue.upvotes * 3
    const daysOld = (Date.now() - new Date(issue.created_at)) / 86400000
    const recency = parseFloat((10 * Math.exp(-daysOld / 7) * 10).toFixed(1))
    const catWeights = { sewage: 5, water: 5, pothole: 4, streetlight: 3, garbage: 3, infrastructure: 2 }
    const categoryScore = (catWeights[issue.category] || 2) * 15

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, minWidth: 320, color: '#f1f5f9' }}>
                <h3 style={{ marginBottom: 16 }}>📊 Impact Score Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                        { label: 'Severity', value: severity, detail: `${issue.severity} × 20` },
                        { label: 'Upvotes', value: upvoteScore, detail: `${issue.upvotes} × 3` },
                        { label: 'Recency', value: recency, detail: `${daysOld.toFixed(1)} days old` },
                        { label: 'Category Weight', value: categoryScore, detail: `${catWeights[issue.category] || 2} × 15` },
                    ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                            <span style={{ color: '#94a3b8' }}>{row.label} <small>({row.detail})</small></span>
                            <span style={{ fontWeight: 700 }}>+{row.value}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontSize: 18, fontWeight: 800 }}>
                        <span>Total</span>
                        <span style={{ color: '#f59e0b' }}>{issue.impact_score}</span>
                    </div>
                </div>
                <button onClick={onClose} style={{ marginTop: 20, width: '100%', padding: 10, background: '#334155', border: 'none', borderRadius: 8, color: '#f1f5f9', cursor: 'pointer' }}>
                    Close
                </button>
            </div>
        </div>
    )
}

function IssueCard({ issue, onUpvote }) {
    const [showBreakdown, setShowBreakdown] = useState(false)
    const [upvoted, setUpvoted] = useState(false)
    const [upvotes, setUpvotes] = useState(issue.upvotes)
    const [score, setScore] = useState(issue.impact_score)
    const { user } = useAuth()
    const navigate = useNavigate()

    async function handleUpvote() {
        if (upvoted) return
        try {
            const formData = new FormData()
            formData.append('user_id', user.id)
            const res = await axios.post(`${BACKEND_URL}/issues/${issue.id}/upvote`, formData)
            setUpvotes(res.data.upvotes)
            setScore(res.data.impact_score)
            setUpvoted(true)
            onUpvote && onUpvote(issue.id, res.data)
        } catch (err) {
            if (err.response?.data?.detail === 'Already upvoted') {
                setUpvoted(true)
            }
        }
    }

    return (
        <>
            {showBreakdown && <ScoreBreakdown issue={{ ...issue, upvotes, impact_score: score }} onClose={() => setShowBreakdown(false)} />}
            <div style={{
                background: '#1e293b', borderRadius: 16, padding: 20,
                display: 'flex', flexDirection: 'column', gap: 12,
                border: '1px solid #334155'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <span style={{
                            background: CATEGORY_COLORS[issue.category] || '#6b7280',
                            color: '#fff', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600
                        }}>
                            {issue.category?.toUpperCase()}
                        </span>
                        <h3 onClick={() => navigate(`/issue/${issue.id}`)}
                            style={{ cursor: 'pointer', color: '#f1f5f9', margin: '8px 0 4px', fontSize: 16 }}>
                            {issue.title}
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>📍 {issue.location_text}</p>
                    </div>
                    <div onClick={() => setShowBreakdown(true)} style={{
                        cursor: 'pointer', background: '#f59e0b', color: '#000',
                        borderRadius: 12, padding: '6px 14px', textAlign: 'center', minWidth: 70
                    }}>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>{score}</div>
                        <div style={{ fontSize: 10, fontWeight: 600 }}>IMPACT</div>
                    </div>
                </div>

                {issue.photo_url && (
                    <img src={issue.photo_url} alt="issue" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10 }} />
                )}

                {issue.ai_summary && (
                    <p style={{ color: '#cbd5e1', fontSize: 13, margin: 0, fontStyle: 'italic' }}>
                        🤖 {issue.ai_summary}
                    </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                        background: STATUS_COLORS[issue.status] || '#6b7280',
                        color: '#fff', padding: '3px 12px', borderRadius: 20, fontSize: 12
                    }}>
                        {issue.status?.replace('_', ' ').toUpperCase()}
                    </span>
                    <button onClick={handleUpvote} style={{
                        background: upvoted ? '#334155' : '#2563eb',
                        color: '#fff', border: 'none', borderRadius: 20,
                        padding: '6px 16px', cursor: upvoted ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6
                    }}>
                        👍 {upvotes} {upvoted ? '(voted)' : 'Upvote'}
                    </button>
                </div>
            </div>
        </>
    )
}

export default function Dashboard() {
    const { profile, logout } = useAuth()
    const navigate = useNavigate()
    const [issues, setIssues] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({ category: '', status: '' })

    async function fetchIssues() {
        setLoading(true)
        try {
            const params = {}
            if (filters.category) params.category = filters.category
            if (filters.status) params.status = filters.status
            const res = await axios.get(`${BACKEND_URL}/issues/`, { params })
            setIssues(res.data.issues)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchIssues() }, [filters])

    function handleUpvote(issueId, newData) {
        setIssues(prev =>
            prev.map(i => i.id === issueId ? { ...i, upvotes: newData.upvotes, impact_score: newData.impact_score } : i)
                .sort((a, b) => b.impact_score - a.impact_score)
        )
    }

    const isAuthority = profile?.role === 'authority' || profile?.role === 'representative'

    return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, color: '#f1f5f9' }}>
            {/* Navbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 22 }}>🏙️ CivicPulse</h1>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {isAuthority && (
                        <button onClick={() => navigate('/authority')} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                            🛠️ Authority Portal
                        </button>
                    )}
                    <button onClick={() => navigate('/report')} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                        + Report Issue
                    </button>
                    <button onClick={() => navigate('/accountability')}
                        style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                        🏆 Accountability
                    </button>
                    <button onClick={logout} style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                    style={{ flex: 1, padding: 8, borderRadius: 8, background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' }}>
                    <option value="">All Categories</option>
                    {['pothole', 'sewage', 'streetlight', 'garbage', 'water', 'infrastructure'].map(c => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                </select>
                <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                    style={{ flex: 1, padding: 8, borderRadius: 8, background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' }}>
                    <option value="">All Statuses</option>
                    {['reported', 'acknowledged', 'in_progress', 'resolved', 'closed'].map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                </select>
            </div>

            {/* Issues */}
            {loading ? (
                <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading issues...</p>
            ) : issues.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8' }}>No issues found. Be the first to report one!</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {issues.map(issue => (
                        <IssueCard key={issue.id} issue={issue} onUpvote={handleUpvote} />
                    ))}
                </div>
            )}
        </div>
    )
}