import React, { useState, useRef, useEffect } from 'react'
import './AudioRecorder.css'

const AudioRecorder = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const animationFrameRef = useRef(null)
  const [audioLevel, setAudioLevel] = useState(0)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      setError(null)
      // Use default audio capture for maximum compatibility and transcription accuracy.
      // (Advanced noise-suppression constraints can sometimes degrade recognition quality.)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendAudioToBackend(audioBlob)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      mediaRecorder.start()
      setIsRecording(true)

      // Start audio level visualization
      startAudioVisualization(stream)
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to access microphone. Please check permissions.')
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      setAudioLevel(0)
    }
  }

  const startAudioVisualization = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    const microphone = audioContext.createMediaStreamSource(stream)
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    analyser.smoothingTimeConstant = 0.8
    analyser.fftSize = 1024
    microphone.connect(analyser)

    const updateLevel = () => {
      if (!isRecording) return
      
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      setAudioLevel(average / 255)
      
      animationFrameRef.current = requestAnimationFrame(updateLevel)
    }
    
    updateLevel()
  }

  const sendAudioToBackend = async (audioBlob) => {
    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')

      const response = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.transcript) {
        onTranscript(data.transcript)
      } else {
        throw new Error('No transcript received from server')
      }
    } catch (err) {
      console.error('Error sending audio:', err)
      setError(err.message || 'Failed to transcribe audio. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="audio-recorder">
      <div className="recorder-container">
        <div className="recorder-visualizer">
          <div 
            className={`recording-circle ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
            style={{
              transform: `scale(${1 + (isRecording ? audioLevel * 0.5 : 0)})`,
              opacity: isRecording ? 0.8 + audioLevel * 0.2 : 0.6
            }}
          >
            {isProcessing ? (
              <div className="spinner"></div>
            ) : isRecording ? (
              <div className="pulse-ring"></div>
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </div>
        </div>

        <div className="recorder-controls">
          {!isRecording && !isProcessing ? (
            <button 
              className="btn-record"
              onClick={startRecording}
              aria-label="Start recording"
            >
              <span className="btn-icon">🎤</span>
              <span>Start Recording</span>
            </button>
          ) : isRecording ? (
            <button 
              className="btn-stop"
              onClick={stopRecording}
              aria-label="Stop recording"
            >
              <span className="btn-icon">⏹</span>
              <span>Stop Recording</span>
            </button>
          ) : (
            <button 
              className="btn-processing"
              disabled
            >
              <span className="btn-icon">⏳</span>
              <span>Processing...</span>
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <div className="recorder-status">
          {isRecording && (
            <div className="status-indicator recording-indicator">
              <span className="status-dot"></span>
              Recording...
            </div>
          )}
          {isProcessing && (
            <div className="status-indicator processing-indicator">
              <span className="status-dot"></span>
              Transcribing...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AudioRecorder
