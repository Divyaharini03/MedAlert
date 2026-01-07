import os
from faster_whisper import WhisperModel
import tempfile

class WhisperService:
    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
        """
        Initialize the Faster Whisper model.
        model_size: "tiny", "base", "small", "medium", "large-v3"
        device: "cpu", "cuda"
        """
        print(f"Loading Whisper model: {model_size}...")
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print("Model loaded successfully.")

    def transcribe(self, audio_path):
        """
        Transcribe an audio file.
        """
        segments, info = self.model.transcribe(audio_path, beam_size=5)
        
        full_text = ""
        for segment in segments:
            full_text += segment.text + " "
            
        return full_text.strip()

# Singleton instance
whisper_instance = WhisperService()
