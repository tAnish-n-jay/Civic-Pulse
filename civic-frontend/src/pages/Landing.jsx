import { useNavigate } from 'react-router-dom'

export default function Landing() {
    const navigate = useNavigate()

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif', padding: '40px 20px' }}>
            {/* Header */}
            <header style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 60 }}>
                <h1 style={{ margin: 0, fontSize: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    🏙️ CivicPulse
                </h1>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: '#f1f5f9', border: '1px solid #334155', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                        Citizen Login
                    </button>
                    <button onClick={() => navigate('/login')} style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                        Authority Portal
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', marginBottom: 80 }}>
                <span style={{ background: '#1e293b', color: '#38bdf8', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid #334155' }}>
                    ✨ Real-Time Urban Accountability Platform
                </span>
                <h2 style={{ fontSize: 48, fontWeight: 800, margin: '24px 0', lineHeight: 1.2 }}>
                    Transforming City Issues into <span style={{ color: '#f59e0b' }}>Measurable Action</span>
                </h2>
                <p style={{ color: '#94a3b8', fontSize: 18, lineHeight: 1.6, marginBottom: 36 }}>
                    Report potholes, broken streetlights, and sanitation problems instantly. Track local authorities in real time with our live impact scoring and transparency leaderboard.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/login')} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: 10, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
                        👤 Citizen Sign In / Report
                    </button>
                    <button onClick={() => navigate('/login')} style={{ background: '#059669', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: 10, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
                        🛠️ Authority Login
                    </button>
                    <button onClick={() => navigate('/accountability')} style={{ background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', padding: '14px 28px', borderRadius: 10, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
                        🏆 View Leaderboard
                    </button>
                </div>
            </section>

            {/* Feature Cards Grid */}
            <section style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 80 }}>
                {[
                    { icon: '📸', title: 'AI-Powered Reporting', desc: 'Snap a photo and let AI automatically categorize, prioritize, and structure civic complaints.' },
                    { icon: '📊', title: 'Dynamic Impact Scoring', desc: 'Issues are scored based on community upvotes, severity weights, and recency decay factors.' },
                    { icon: '🏆', title: 'Authority Accountability', desc: 'Hold departments accountable with transparent resolution rates, response speeds, and citizen satisfaction grades.' }
                ].map((feat, index) => (
                    <div key={index} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ fontSize: 32 }}>{feat.icon}</div>
                        <h3 style={{ margin: 0, fontSize: 18, color: '#f1f5f9' }}>{feat.title}</h3>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>{feat.desc}</p>
                    </div>
                ))}
            </section>

            {/* Footer */}
            <footer style={{ textAlign: 'center', borderTop: '1px solid #1e293b', paddingTop: 24, color: '#64748b', fontSize: 13 }}>
                © {new Date().getFullYear()} CivicPulse. Empowering citizens and local authorities together.
            </footer>
        </div>
    )
}