import os
import shutil
import tempfile
import json
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from whisper_service import whisper_instance
from medcat_layer import medcat_extractor
from action_executor import executeEmergencyAction
from typing import Any, Dict, List

app = FastAPI(title="MedAlert Backend")

# File paths
RULES_FILE = os.path.join(os.path.dirname(__file__), "medical_rules.json")
HISTORY_FILE = os.path.join(os.path.dirname(__file__), "history.json")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_rules():
    if not os.path.exists(RULES_FILE):
        return []
    with open(RULES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def load_history():
    if not os.path.exists(HISTORY_FILE):
        return []
    with open(HISTORY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_history(history):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

def generate_advice(transcript: str):
    rules = load_rules()
    text = transcript.lower()
    matches = []
    
    for rule in rules:
        if any(keyword.lower() in text for keyword in rule["keywords"]):
            matches.append(rule)

    if matches:
        priority = {"high": 3, "elevated": 2, "low": 1}
        best = sorted(matches, key=lambda x: priority.get(x["risk"], 0), reverse=True)[0]
        return {
            "title": best["title"],
            "message": best["message"],
            "risk": best["risk"]
        }

    return {
        "title": "General Guidance",
        "message": "I could not detect a clear symptom. Please mention your symptom. If you feel unwell, seek medical advice.",
        "risk": "low"
    }

@app.get("/")
def read_root():
    return {"status": "MedAlert API is running"}

@app.get("/rules")
def get_rules():
    return load_rules()

@app.get("/history")
def get_history():
    return load_history()

@app.post("/analyze")
async def analyze_transcript(payload: Dict[str, Any]):
    transcript = payload.get("transcript", "")
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")
    
    advice = generate_advice(transcript)
    
    # Save to history
    history = load_history()
    entry = {
        "id": int(datetime.now().timestamp() * 1000),
        "text": transcript,
        "timestamp": datetime.now().strftime("%I:%M:%S %p"),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "advice": advice
    }
    history.insert(0, entry)
    save_history(history[:100]) # Keep last 100 entries
    
    # If high risk, trigger emergency action
    if advice["risk"] == "high":
        await executeEmergencyAction({
            "risk": "high",
            "reason": advice["title"].replace(" ", "_").lower(),
            "transcript": transcript,
            "confidence": 0.8
        })
        
    return advice

@app.post("/agent/emergency")
async def trigger_emergency_action(payload: Dict[str, Any]):
    print(f"DEBUG: Received emergency trigger with payload: {payload}")
    result = await executeEmergencyAction(payload)
    return result

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not file.content_type.startswith("audio/"):
        if file.filename and not (file.filename.endswith(".webm") or file.filename.endswith(".wav") or file.filename.endswith(".mp3")):
            raise HTTPException(status_code=400, detail="File must be an audio file")

    try:
        suffix = os.path.splitext(file.filename)[1] if file.filename else ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            shutil.copyfileobj(file.file, tmp_file)
            tmp_path = tmp_file.name

        transcript = whisper_instance.transcribe(tmp_path)
        
        # New: Analyze automatically after transcription
        advice = generate_advice(transcript)
        
        # Save to history
        history = load_history()
        entry = {
            "id": int(datetime.now().timestamp() * 1000),
            "text": transcript,
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "advice": advice
        }
        history.insert(0, entry)
        save_history(history[:100])

        if advice["risk"] == "high":
            await executeEmergencyAction({
                "risk": "high",
                "reason": advice["title"].replace(" ", "_").lower(),
                "transcript": transcript,
                "confidence": 0.8
            })

        os.remove(tmp_path)

        return {
            "filename": file.filename,
            "transcript": transcript,
            "advice": advice
        }
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
