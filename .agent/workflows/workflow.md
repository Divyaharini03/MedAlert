---
description: end-to-end MedAlert autonomous emergency workflow
---

# MedAlert Autonomous Emergency Workflow

This workflow describes the autonomous decision-making process from the moment a patient speaks to the initiation of an emergency phone call.

## End-to-End Process

1. **Voice Input / Physical Trigger**:
   - The user clicks the **Start Recording** button 🎤 or selects a **Quick Diagnostic Shortcut** (e.g., "Chest Pain").
   - `AudioRecorder.jsx` captures high-quality audio or sends a predefined symptom string.

2. **Transcription (STT)**:
   - Captured audio is sent to the backend `/transcribe` endpoint (`main.py`).
   - The system utilizes **OpenAI Whisper** via `whisper_service.py` to convert audio into medical-grade text.

3. **Medical Symptom Extraction**:
   - The transcribed text is passed to the **MedCAT Layer** (`medcat_layer.py`).
   - MedCAT identifies medical concepts (CUI) and assigns confidence scores.

4. **Risk Analysis**:
   - The system evaluates extracted symptoms against a **Risk Palette**:
     - **Low**: General health advice.
     - **Elevated**: Monitoring required.
     - **High**: Potential emergency detected (e.g., Chest Pain, Heavy Bleeding).

5. **Autonomous Action Execution**:
   - If a **High-Risk** symptom is detected with >0.7 confidence:
   - `action_executor.py` triggers the `CallService`.
   - The frontend displays a high-visibility **Emergency Overlay**.

6. **Twilio Autonomous Call**:
   - `call_service.py` initiates a real-time phone call to the verified **Doctor's Number**.
   - A synthesized voice message is played to the doctor, describing the emergency status and symptoms.

7. **Loop Closure**:
   - The transcript and generated advice are saved to the **Emergency History** panel for record-keeping.
