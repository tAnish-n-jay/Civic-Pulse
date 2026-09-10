import { useState, useEffect } from 'react'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

export default function Accountability() {
    const [authorities, setAuthorities] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        axios.get(`${BACKEND_URL}/accountability/`)
            .then(res => setAuthorities(res.data.authorities))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, color: '#f1f5f9' }}>
            <h1 style={{ fontSize: 24, marginBottom: 4 }}>🏆 Authority Accountability</h1>
            <p style={{ color: '#94a3b8', marginBottom: 24 }}>Public leaderboard — updated in real time as citizens verify resolutions.</p>

            {loading ? (
                <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</p>
            ) : authorities.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8' }}>No authority data yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {authorities.map((auth, idx) => (
                        <div key={auth.id} style={{
                            background: '#1e293b', borderRadius: 16, padding: 20,
                            border: `1px solid ${auth.color}44`
                        }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%',
                                        background: auth.color + '22', border: `2px solid ${auth.color}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 18, fontWeight: 800, color: auth.color
                                    }}>
                                        #{idx + 1}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, color: '#f1f5f9' }}>{auth.name}</h3>
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>{auth.department}</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 32, fontWeight: 800, color: auth.color }}>{auth.accountability_score}</div>
                                    <div style={{ fontSize: 13, color: auth.color }}>{auth.emoji} {auth.grade}</div>
                                </div>
                            </div>

                            {/* Score Bar */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ background: '#0f172a', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${auth.accountability_score}%`, height: '100%',
                                        background: auth.color, borderRadius: 8,
                                        transition: 'width 0.5s ease'
                                    }} />
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                {[
                                    { label: 'Assigned', value: auth.total_assigned },
                                    { label: 'Resolved', value: auth.total_resolved },
                                    { label: 'Resolution Rate', value: `${auth.resolution_rate}%` },
                                    { label: 'Satisfaction', value: `${auth.satisfaction_rate}%` },
                                ].map(stat => (
                                    <div key={stat.label} style={{
                                        background: '#0f172a', borderRadius: 10, padding: '10px 12px', textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{stat.value}</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{stat.label}</div>
                                    </div>
                                ))}
                            </div>

                            {auth.avg_resolution_days > 0 && (
                                <p style={{ color: '#94a3b8', fontSize: 12, margin: '12px 0 0', textAlign: 'right' }}>
                                    ⏱ Avg resolution time: {auth.avg_resolution_days} days
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}