import React, { useState, useMemo, useRef } from 'react'
import AudioRecorder from './AudioRecorder'
import './App.css'

function App() {
  const [entries, setEntries] = useState([])
  const [latestAdvice, setLatestAdvice] = useState(null)
  const [manualText, setManualText] = useState('')
  const [isCalling, setIsCalling] = useState(false)
  const emergencyTriggeredRef = useRef(false)

  const riskPalette = useMemo(() => ({
    low: '#4caf50',
    elevated: '#ffb74d',
    high: '#f44336'
  }), [])

  const SYMPTOM_RULES = useMemo(() => ([
    // Respiratory and cardiac
    {
      name: 'Chest Pain',
      keywords: [/chest pain/, /tight chest/, /pressure chest/, /angina/],
      title: 'Elevated Concern',
      message: 'Chest pain can be serious. Seek urgent medical attention or call emergency services if severe, sudden, radiating, or with shortness of breath.',
      risk: 'high'
    },
    {
      name: 'Shortness of Breath',
      keywords: [/shortness of breath/, /hard to breathe/, /breathless/, /difficulty breathing/, /cant breathe/, /cant breath/],
      title: 'Breathing Concern',
      message: 'Breathing difficulty warrants caution. If sudden, severe, or with chest pain, seek urgent medical attention.',
      risk: 'high'
    },
    {
      name: 'Cough',
      keywords: [/cough/, /coughing/],
      title: 'Cough Noted',
      message: 'Stay hydrated. If cough is persistent, with fever or shortness of breath, or produces blood, seek medical advice.',
      risk: 'elevated'
    },
    // Fever and infection
    {
      name: 'Fever',
      keywords: [/fever/, /high temp/, /temperature/, /hot/i],
      title: 'Fever Detected',
      message: 'Monitor temperature, hydrate, and rest. If fever exceeds 103°F (39.4°C), lasts >3 days, or pairs with chest pain or shortness of breath, seek care promptly.',
      risk: 'elevated'
    },
    {
      name: 'Sore Throat',
      keywords: [/sore throat/, /throat pain/, /scratchy throat/],
      title: 'Sore Throat Noted',
      message: 'Hydrate, use warm saline gargles, and rest. If severe pain, trouble swallowing, or high fever, seek medical advice.',
      risk: 'elevated'
    },
    // Neuro/head
    {
      name: 'Headache',
      keywords: [/headache/, /migraine/],
      title: 'Headache Noted',
      message: 'Rest, hydrate, and consider appropriate OTC relief. If sudden severe “worst-ever” headache, with fever, neck stiffness, or neuro symptoms, seek care urgently.',
      risk: 'elevated'
    },
    {
      name: 'Dizziness',
      keywords: [/dizzy/, /dizziness/, /lightheaded/],
      title: 'Dizziness Noted',
      message: 'Sit or lie down to avoid falls, hydrate, and rise slowly. If severe, persistent, fainting, or with chest pain/shortness of breath, seek care.',
      risk: 'elevated'
    },
    {
      name: 'Confusion',
      keywords: [/confused/, /confusion/, /disoriented/],
      title: 'Confusion Noted',
      message: 'Confusion is concerning. Ensure safety, and seek medical evaluation promptly, especially if sudden onset.',
      risk: 'high'
    },
    // GI
    {
      name: 'Nausea',
      keywords: [/nausea/, /nauseous/, /vomit/, /vomiting/],
      title: 'Nausea/Vomiting Noted',
      message: 'Small sips of clear fluids and rest. If unable to keep fluids down, signs of dehydration, blood in vomit, or severe pain, seek care.',
      risk: 'elevated'
    },
    {
      name: 'Diarrhea',
      keywords: [/diarrhea/, /loose stool/],
      title: 'Diarrhea Noted',
      message: 'Hydrate with electrolytes. If persistent, bloody, with fever, or signs of dehydration, seek medical advice.',
      risk: 'elevated'
    },
    {
      name: 'Abdominal Pain',
      keywords: [/abdominal pain/, /stomach pain/, /belly pain/, /abdomen hurts/],
      title: 'Abdominal Pain Noted',
      message: 'Rest, hydrate, and monitor. If severe, worsening, localized (e.g., right-lower abdomen), or with fever/vomiting, seek medical care.',
      risk: 'elevated'
    },
    // Other common concerns
    {
      name: 'Rash',
      keywords: [/rash/, /hives/],
      title: 'Rash Noted',
      message: 'Monitor the rash. If rapidly spreading, painful, with fever or breathing issues, seek medical attention.',
      risk: 'elevated'
    },
    {
      name: 'Fatigue',
      keywords: [/fatigue/, /tiredness/, /exhausted/],
      title: 'Fatigue Noted',
      message: 'Rest and hydrate. If severe, persistent, or with chest pain, shortness of breath, or weight loss, seek medical advice.',
      risk: 'elevated'
    },
    {
      name: 'Palpitations',
      keywords: [/palpitation/, /heart racing/, /rapid heartbeat/, /skipped beats/],
      title: 'Palpitations Noted',
      message: 'If persistent, with dizziness, chest pain, or fainting, seek medical evaluation.',
      risk: 'high'
    },
    {
      name: 'Fainting',
      keywords: [/faint/, /fainting/, /passed out/, /loss of consciousness/],
      title: 'Fainting Noted',
      message: 'Ensure safety and seek medical evaluation promptly, especially if associated with chest pain, palpitations, or shortness of breath.',
      risk: 'high'
    },
    // Trauma / bleeding / emergency keywords
    {
      name: 'Bleeding',
      keywords: [/bleeding/, /hemorrhage/, /blood loss/],
      title: 'Bleeding Noted',
      message: 'Apply direct pressure to bleeding if safe to do so. If heavy bleeding or uncontrolled, seek emergency care immediately.',
      risk: 'high'
    },
    {
      name: 'Injury',
      keywords: [/injury/, /leg injury/, /trauma/, /fracture/, /broken bone/],
      title: 'Injury Noted',
      message: 'Protect the injured area, avoid weight-bearing if a limb is involved, and seek medical evaluation. For severe pain, deformity, or open wounds, seek urgent care.',
      risk: 'elevated'
    },
    {
      name: 'Heart Attack',
      keywords: [/heart attack/, /myocardial infarction/],
      title: 'Possible Heart Attack',
      message: 'Chest discomfort with concern for heart attack is an emergency. Call emergency services and seek immediate care.',
      risk: 'high'
    },
    {
      name: 'Emergency',
      keywords: [/emergency/, /emergenc(y|v|vy)/, /911/, /call ambulance/, /need help now/],
      title: 'Emergency Mentioned',
      message: 'You mentioned an emergency. If you or someone is in immediate danger, call local emergency services right away.',
      risk: 'high'
    },
    {
      name: 'Help',
      keywords: [/help/, /need help/, /assist/, /assistance/],
      title: 'Help Requested',
      message: 'You asked for help. If this is a medical emergency or someone is in danger, call local emergency services right away.',
      risk: 'high'
    },
    {
      name: 'Pain',
      keywords: [/pain/, /paining/, /aching/, /hurts/],
      title: 'Pain Noted',
      message: 'Pain can range in severity. If severe, worsening, sudden, or with chest pain/shortness of breath/fever, seek medical evaluation.',
      risk: 'elevated'
    },
    // Infectious diseases (high-level cues)
    {
      name: 'Dengue',
      keywords: [/dengue/, /dengu/],
      title: 'Dengue Concern',
      message: 'Fever, aches, and bleeding risk can occur with dengue. Stay hydrated and seek medical evaluation, especially if abdominal pain, vomiting, or bleeding/bruising appear.',
      risk: 'elevated'
    },
    {
      name: 'Typhoid',
      keywords: [/typhoid/],
      title: 'Typhoid Concern',
      message: 'Typhoid can present with fever and abdominal symptoms. Seek medical evaluation for testing and treatment.',
      risk: 'elevated'
    },
    {
      name: 'Malaria',
      keywords: [/malaria/],
      title: 'Malaria Concern',
      message: 'Malaria can be serious. If fever follows travel to or residence in malaria areas, seek medical evaluation promptly.',
      risk: 'high'
    },
    {
      name: 'Flu',
      keywords: [/flu/, /influenza/],
      title: 'Flu-like Illness',
      message: 'Rest, hydrate, and monitor. If breathing difficulty, chest pain, or persistent high fever occur, seek medical care.',
      risk: 'elevated'
    },
    {
      name: 'COVID',
      keywords: [/covid/, /corona/, /sars-cov-2/],
      title: 'COVID-like Illness',
      message: 'Monitor symptoms, isolate as appropriate, hydrate, and rest. If shortness of breath, chest pain, or low oxygen levels occur, seek urgent care.',
      risk: 'elevated'
    },
    {
      name: 'Infection',
      keywords: [/infection/, /infected/],
      title: 'Infection Mentioned',
      message: 'Monitor for fever, redness, swelling, or worsening pain. If severe symptoms or spreading, seek medical evaluation.',
      risk: 'elevated'
    }
  ]), [])

  const generateAdvice = (transcript) => {
    const text = transcript.toLowerCase()
    const matches = SYMPTOM_RULES.filter(rule =>
      rule.keywords.some(re => re.test(text))
    )

    if (matches.length > 0) {
      // Pick the highest-risk match (high > elevated > low)
      const priority = { high: 3, elevated: 2, low: 1 }
      const best = matches.sort((a, b) => priority[b.risk] - priority[a.risk])[0]
      return {
        title: best.title,
        message: best.message,
        risk: best.risk
      }
    }

    // Fallback: unclear/other text
    return {
      title: 'General Guidance',
      message: 'I could not detect a clear symptom. Please mention your symptom (e.g., “fever”, “chest pain”, “shortness of breath”). If you feel unwell, seek medical advice.',
      risk: 'low'
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

  const notifyEmergencyBackend = async (advice, transcript) => {
    // For testing, we allow multiple triggers. In prod, use a formal debounce.
    console.log('Sending emergency trigger to backend...', advice.title)

    const context = {
      risk: 'high',
      reason: advice.title.replace(/\s+/g, '_').toLowerCase(),
      symptoms: [], // could be enriched later with backend MedCAT output
      confidence: 0.8,
      transcript,
    }

    try {
      setIsCalling(true)
      const response = await fetch('http://localhost:8000/agent/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      })
      const data = await response.json()
      console.log('Backend response:', data)
    } catch (err) {
      console.error('Failed to notify emergency action layer', err)
    }
  }

  const handleTranscript = (transcript) => {
    const advice = generateAdvice(transcript)

    if (advice.risk === 'high') {
      notifyEmergencyBackend(advice, transcript)
    }

    setLatestAdvice(advice)
    speakAdvice(advice.message)

    setEntries(prev => [
      {
        id: Date.now(),
        text: transcript,
        timestamp: new Date().toLocaleTimeString(),
        advice,
      },
      ...prev
    ])
  }

  const clearTranscripts = () => {
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

  return (
    <div className="app">
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">
            <span className="title-icon">🏥</span>
            MedAlert
          </h1>
          <p className="app-subtitle">Speech-to-Text Transcription</p>
        </header>

        <main className="app-main">
          {latestAdvice && latestAdvice.risk === 'high' && (
            <div className="alert-bar">
              <span className="alert-pill">ALERT</span>
              <span className="alert-text">
                This may represent a higher-risk situation. {isCalling ? <strong>AUTONOMOUS CALL INITIATED: Calling doctor...</strong> : "If you or someone else feels unsafe or very unwell, contact local emergency services or a clinician immediately."}
              </span>
            </div>
          )}

          <section className="recorder-section">
            <AudioRecorder onTranscript={handleTranscript} />
          </section>

          <section className="manual-section">
            <div className="manual-header">
              <h2>Type Symptoms</h2>
              <p className="manual-subtitle">Enter symptoms to get advice as text and speech</p>
            </div>
            <form className="manual-form" onSubmit={handleManualSubmit}>
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="e.g., I have fever and cough"
                aria-label="Type your symptoms"
              />
              <button type="submit">Get Advice</button>
            </form>
          </section>

          <section className="advice-section">
            <div className="advice-header">
              <h2>Advice</h2>
              <p className="advice-subtitle">Auto-generated guidance from detected terms</p>
            </div>
            {latestAdvice ? (
              <div className="advice-card" style={{ borderColor: riskPalette[latestAdvice.risk] }}>
                <div className="advice-tag" style={{ background: riskPalette[latestAdvice.risk] }}>
                  {latestAdvice.risk.toUpperCase()}
                </div>
                <h3>{latestAdvice.title}</h3>
                <p>{latestAdvice.message}</p>
              </div>
            ) : (
              <div className="advice-empty">
                <div className="empty-icon">💡</div>
                <p>No advice yet</p>
                <p className="empty-hint">Say a symptom like “fever” to get guidance</p>
              </div>
            )}
          </section>

          <section className="transcripts-section">
            <div className="transcripts-header">
              <h2>Transcripts</h2>
              {entries.length > 0 && (
                <button className="btn-clear" onClick={clearTranscripts}>
                  Clear All
                </button>
              )}
            </div>

            <div className="transcripts-list">
              {entries.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <p>No transcripts yet</p>
                  <p className="empty-hint">Start recording to see your transcripts here</p>
                </div>
              ) : (
                entries.map((item) => (
                  <div key={item.id} className="transcript-card">
                    <div className="transcript-header">
                      <span className="transcript-time">{item.timestamp}</span>
                      {item.advice && (
                        <span
                          className="transcript-badge"
                          style={{ background: riskPalette[item.advice.risk] }}
                        >
                          {item.advice.title}
                        </span>
                      )}
                    </div>
                    <div className="transcript-text">{item.text}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
