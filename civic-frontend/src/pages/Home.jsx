import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Home() {
    const { profile, logout } = useAuth()
    const navigate = useNavigate()

    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    return (
        <div style={{ padding: 32 }}>
            <h2>Welcome, {profile?.name || 'Citizen'}</h2>
            <p>Role: <strong>{profile?.role}</strong></p>
            <button onClick={handleLogout}>Logout</button>
        </div>
    )
}