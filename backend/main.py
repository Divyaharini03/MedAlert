from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import tempfile
from whisper_service import whisper_instance
from medcat_layer import medcat_extractor
from action_executor import executeEmergencyAction
from typing import Any, Dict

app = FastAPI(title="MedAlert Backend")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "MedAlert API is running"}


@app.post("/agent/emergency")
async def trigger_emergency_action(payload: Dict[str, Any]):
    print(f"DEBUG: Received emergency trigger with payload: {payload}")
    result = await executeEmergencyAction(payload)
    return result

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Endpoint to receive an audio file and return the transcript.
    """
    if not file.content_type.startswith("audio/"):
        # Some browsers might send 'application/octet-stream' for webm/wav
        if file.filename and not (file.filename.endswith(".webm") or file.filename.endswith(".wav") or file.filename.endswith(".mp3")):
            raise HTTPException(status_code=400, detail="File must be an audio file")

    try:
        # Create a temporary file to save the uploaded audio
        suffix = os.path.splitext(file.filename)[1] if file.filename else ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            shutil.copyfileobj(file.file, tmp_file)
            tmp_path = tmp_file.name

        # Transcribe using Whisper (unchanged)
        transcript = whisper_instance.transcribe(tmp_path)

        # MedCAT ontology-based symptom / entity extraction (read-only signal)
        medcat_result = medcat_extractor.extract_symptoms(transcript)
        print("MedCAT result:", medcat_result)

        # Cleanup
        os.remove(tmp_path)

        return {
            "filename": file.filename,
            "transcript": transcript,
            "medcat": medcat_result,
        }
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
