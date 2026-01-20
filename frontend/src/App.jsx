import React, { useState, useEffect, useMemo, useRef } from 'react'
import AudioRecorder from './AudioRecorder'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [entries, setEntries] = useState([])
  const [latestAdvice, setLatestAdvice] = useState(null)
  const [manualText, setManualText] = useState('')
  const [isCalling, setIsCalling] = useState(false)
  const [callStatus, setCallStatus] = useState(null)
  const [rules, setRules] = useState([])
  const emergencyTriggeredRef = useRef(false)

  const riskPalette = useMemo(() => ({
    low: '#4caf50',
    elevated: '#ffb74d',
    high: '#f44336'
  }), [])

  useEffect(() => {
    fetchRules()
    fetchHistory()
    // Poll history every 10 seconds to stay updated
    const interval = setInterval(fetchHistory, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchRules = async () => {
    try {
      const resp = await fetch('http://localhost:8000/rules')
      const data = await resp.json()
      setRules(data)
    } catch (err) {
      console.error('Failed to fetch rules', err)
    }
  }

  const fetchHistory = async () => {
    try {
      const resp = await fetch('http://localhost:8000/history')
      const data = await resp.json()
      setEntries(data)
    } catch (err) {
      console.error('Failed to fetch history', err)
    }
  }

  const handleTranscript = async (transcript) => {
    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      const advice = await response.json()

      setLatestAdvice(advice)
      speakAdvice(advice.message)
      fetchHistory() // Refresh history

      if (advice.risk === 'high') {
        setIsCalling(true)
        // Simulation delay for call status
        setTimeout(() => setIsCalling(false), 5000)
      }
    } catch (err) {
      console.error('Failed to analyze transcript', err)
    }
  }

  const speakAdvice = (message) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(message)
    utterance.rate = 1
    utterance.pitch = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const clearTranscripts = async () => {
    // In a real app, we'd have a DELETE /history endpoint. 
    // For now, let's just clear local state if the backend doesn't support it yet, 
    // or we could implement a simple clear on backend.
    setEntries([])
    setLatestAdvice(null)
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const text = manualText.trim()
    if (!text) return
    handleTranscript(text)
    setManualText('')
  }

  const renderHome = () => (
    <>
      <div className="search-area">
        <form className="manual-form" onSubmit={handleManualSubmit}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Search symptoms or patient events..."
            aria-label="Search symptoms"
          />
          <button type="submit">Analyze</button>
        </form>
      </div>

      <div className="categories-row">
        <div className="chip active">All Events</div>
        <div className="chip" onClick={() => handleTranscript("I feel dizzy")}>Dizziness</div>
        <div className="chip" onClick={() => handleTranscript("I have a fever")}>Fever</div>
        <div className="chip" onClick={() => handleTranscript("My chest hurts")}>Chest Pain</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.8rem', color: '#64748b' }}>
          <span className="pulse-dot"></span>
          <strong>{rules.length} Clinical Rules Active</strong>
        </div>
      </div>

      <section className="hero-section">
        <div className="banner-card">
          <div className="banner-image-placeholder">💊</div>
          <div className="banner-subtitle">Current Patient Status</div>
          <h2 className="banner-title">
            {latestAdvice ? latestAdvice.title : "Waiting for Input"}
          </h2>
          <p className="banner-subtitle">
            {latestAdvice ? latestAdvice.message : "Use voice or text to describe patient symptoms for immediate agentic analysis."}
          </p>
        </div>
      </section>

      <section className="recorder-section">
        <AudioRecorder onTranscript={handleTranscript} />
      </section>

      <section className="symptoms-section">
        <div className="section-header">
          <h2>Quick Diagnostic Shortcuts</h2>
        </div>
        <div className="symptom-icons-row">
          {rules.slice(0, 5).map(rule => (
            <div key={rule.name} className="symptom-item" onClick={() => handleTranscript(`I have ${rule.name.toLowerCase()}`)}>
              <div className="icon-circle">
                {rule.risk === 'high' ? '🚨' : rule.name.includes('Chest') ? '🫀' : rule.name.includes('Head') ? '🧠' : '🌡️'}
              </div>
              <span className="symptom-label">{rule.name}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )

  const renderHistory = () => (
    <div className="history-view" style={{ padding: '2rem' }}>
      <header className="section-header" style={{ marginBottom: '2rem' }}>
        <h2>Full Event Timeline</h2>
        <p style={{ color: '#64748b' }}>Comprehensive history of all detected medical events.</p>
      </header>
      <div className="history-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {entries.map(item => (
          <div key={item.id} className="transcript-card" style={{ margin: 0 }}>
            <div className="card-status-indicator" style={{ background: riskPalette[item.advice?.risk || 'low'] }}></div>
            <div className="card-content">
              <div className="card-top">
                <span className="card-status-label" style={{ color: riskPalette[item.advice?.risk || 'low'] }}>
                  {item.advice?.risk.toUpperCase() || 'NORMAL'}
                </span>
                <span className="card-time">{item.timestamp}</span>
              </div>
              <div className="card-text">{item.text}</div>
              <div className="card-advice" style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#64748b' }}>
                {item.advice?.title}
              </div>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div style={{ textAlign: 'center', gridColumn: '1/-1', padding: '5rem', color: '#94a3b8' }}>
            <p>No medical history available yet.</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderStats = () => {
    const stats = entries.reduce((acc, item) => {
      acc[item.advice?.risk || 'low'] = (acc[item.advice?.risk || 'low'] || 0) + 1
      return acc
    }, {})

    const total = entries.length || 1

    return (
      <div className="stats-view" style={{ padding: '2rem' }}>
        <header className="section-header" style={{ marginBottom: '2rem' }}>
          <h2>Health Analytics</h2>
          <p style={{ color: '#64748b' }}>Real-time risk distribution and event statistics.</p>
        </header>

        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
          <div className="stat-card" style={{ background: 'white', padding: '2rem', borderRadius: '24px', border: '1px solid #f3f4f6', textAlign: 'center' }}>
            <h3 style={{ color: '#f44336', fontSize: '2.5rem', marginBottom: '0.5rem' }}>{stats.high || 0}</h3>
            <p style={{ fontWeight: 700, color: '#64748b' }}>High Risk Events</p>
            <div style={{ height: '4px', background: '#f44336', width: `${((stats.high || 0) / total) * 100}%`, margin: '1rem auto 0', borderRadius: '2px' }}></div>
          </div>
          <div className="stat-card" style={{ background: 'white', padding: '2rem', borderRadius: '24px', border: '1px solid #f3f4f6', textAlign: 'center' }}>
            <h3 style={{ color: '#ffb74d', fontSize: '2.5rem', marginBottom: '0.5rem' }}>{stats.elevated || 0}</h3>
            <p style={{ fontWeight: 700, color: '#64748b' }}>Elevated Risk Events</p>
            <div style={{ height: '4px', background: '#ffb74d', width: `${((stats.elevated || 0) / total) * 100}%`, margin: '1rem auto 0', borderRadius: '2px' }}></div>
          </div>
          <div className="stat-card" style={{ background: 'white', padding: '2rem', borderRadius: '24px', border: '1px solid #f3f4f6', textAlign: 'center' }}>
            <h3 style={{ color: '#4caf50', fontSize: '2.5rem', marginBottom: '0.5rem' }}>{stats.low || 0}</h3>
            <p style={{ fontWeight: 700, color: '#64748b' }}>Low Risk/Normal</p>
            <div style={{ height: '4px', background: '#4caf50', width: `${((stats.low || 0) / total) * 100}%`, margin: '1rem auto 0', borderRadius: '2px' }}></div>
          </div>
        </div>

        <div className="summary-chart" style={{ marginTop: '3rem', background: '#f8fafc', padding: '2rem', borderRadius: '24px' }}>
          <h3>Event Frequency</h3>
          <p>Total events recorded: {entries.length}</p>
        </div>
      </div>
    )
  }

  const renderClinicalRules = () => (
    <div className="rules-view" style={{ padding: '2rem' }}>
      <header className="section-header" style={{ marginBottom: '2rem' }}>
        <h2>Dynamic Clinical Rules Engine</h2>
        <p style={{ color: '#64748b' }}>Currently active monitoring parameters fetched live from the MedAlert Backend.</p>
      </header>
      <div className="rules-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {rules.map(rule => (
          <div key={rule.name} className="rule-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{rule.name}</h3>
              <span style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'white',
                background: riskPalette[rule.risk]
              }}>{rule.risk.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {rule.keywords.map(kw => (
                <span key={kw} style={{ background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {kw}
                </span>
              ))}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>{rule.message}</p>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">🏥</div>
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </div>
        <div className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <span className="nav-icon">📜</span>
          <span className="nav-label">History</span>
        </div>
        <div className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          <span className="nav-icon">📊</span>
          <span className="nav-label">Stats</span>
        </div>
        <div className={`nav-item ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>
          <span className="nav-icon">📋</span>
          <span className="nav-label">Rules</span>
        </div>
      </aside>

      <div className="app-container">
        {latestAdvice && latestAdvice.risk === 'high' && !emergencyTriggeredRef.current && (
          <div className="alert-overlay">
            <div className="alert-icon-big">🚨</div>
            <div className="alert-message-big">{latestAdvice.title}</div>
            <p>{latestAdvice.message}</p>
            {isCalling && (
              <div className="call-status-detail" style={{ color: 'white', marginTop: '1rem', fontWeight: 700 }}>
                Autonomous Call Initiated...
              </div>
            )}
            <button className="btn-dismiss" onClick={() => emergencyTriggeredRef.current = true}>
              Dismiss Alert
            </button>
          </div>
        )}

        <main className="main-column">
          <header className="app-header">
            <div className="app-title">
              <span className="title-icon">🏥</span>
              MedAlert Dashboard
            </div>
            <div className="user-profile-sm">
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Pro Account</span>
            </div>
          </header>

          {activeTab === 'home' && renderHome()}
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'rules' && renderClinicalRules()}
        </main>

        <aside className="history-panel">
          <div className="panel-header">
            <h2>Recent Activities</h2>
            {entries.length > 0 && (
              <button className="btn-clear" style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }} onClick={clearTranscripts}>
                Clear
              </button>
            )}
          </div>

          <div className="transcripts-list">
            {entries.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                <p>No recent activities detected.</p>
              </div>
            ) : (
              entries.slice(0, 5).map((item) => (
                <div key={item.id} className="transcript-card">
                  <div
                    className="card-status-indicator"
                    style={{ background: riskPalette[item.advice?.risk || 'low'] }}
                  ></div>
                  <div className="card-content">
                    <div className="card-top">
                      <span className="card-status-label" style={{ color: riskPalette[item.advice?.risk || 'low'] }}>
                        {item.advice?.risk.toUpperCase() || 'NORMAL'}
                      </span>
                      <span className="card-time">{item.timestamp}</span>
                    </div>
                    <div className="card-text">{item.text}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App
