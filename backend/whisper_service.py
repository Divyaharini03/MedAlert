import os
import tempfile

try:
    from faster_whisper import WhisperModel
    HAS_WHISPER = True
except ImportError:
    print("WARNING: faster_whisper not found. WhisperService will run in MOCK mode.")
    WhisperModel = None
    HAS_WHISPER = False

class WhisperService:
    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
        """
        Initialize the Faster Whisper model.
        """
        self.model = None
        if HAS_WHISPER:
            try:
                print(f"Loading Whisper model: {model_size}...")
                self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
                print("Model loaded successfully.")
            except Exception as e:
                print(f"Failed to load Whisper model: {e}. Falling back to MOCK mode.")
                self.model = None

    def transcribe(self, audio_path):
        """
        Transcribe an audio file.
        """
        if self.model:
            segments, info = self.model.transcribe(audio_path, beam_size=5)
            full_text = ""
            for segment in segments:
                full_text += segment.text + " "
            return full_text.strip()
        else:
            return "Mock transcript: The patient reports feeling unwell with high risk symptoms."

# Singleton instance
whisper_instance = WhisperService()
