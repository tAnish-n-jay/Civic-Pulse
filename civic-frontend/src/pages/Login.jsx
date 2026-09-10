import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const { error } = await login(email, password)
        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            navigate('/dashboard')
        }
    }

    return (
        <div style={{ maxWidth: 400, margin: '100px auto', padding: 24, background: '#1e293b', borderRadius: 16, color: '#f1f5f9', border: '1px solid #334155' }}>
            <h2 style={{ marginBottom: 20 }}>CivicPulse — Login</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="email" placeholder="Email" value={email}
                    onChange={e => setEmail(e.target.value)} required
                    style={{ display: 'block', width: '100%', marginBottom: 12, padding: 10, borderRadius: 8, background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155' }}
                />
                <input
                    type="password" placeholder="Password" value={password}
                    onChange={e => setPassword(e.target.value)} required
                    style={{ display: 'block', width: '100%', marginBottom: 12, padding: 10, borderRadius: 8, background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155' }}
                />
                {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}
                <button type="submit" disabled={loading} style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    )
}