import os
from twilio.rest import Client
from dotenv import load_dotenv
from pathlib import Path

# Load from specific path to be safe
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

class CallService:
    """
    Service to handle automated phone calls using Twilio.
    """
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_PHONE_NUMBER")
        self.doctor_number = os.getenv("DOCTOR_PHONE_NUMBER")
        
        self.client = None
        if self.account_sid and self.auth_token:
            try:
                self.client = Client(self.account_sid, self.auth_token)
            except Exception as e:
                print(f"Failed to initialize Twilio client: {e}")

    def make_emergency_call(self, reason: str, symptoms: list):
        """
        Initiates an automated emergency call to the doctor.
        """
        # Format the message for TwiML
        symptoms_str = ", ".join(symptoms) if symptoms else "not specified"
        message = (
            f"Hello Doctor. This is an automated alert from MedAlert Agent. "
            f"A patient has been detected with high-risk symptoms. "
            f"Primary concern: {reason.replace('_', ' ')}. "
            f"Symptoms reported: {symptoms_str}. "
            f"Please check the MedAlert dashboard for full details."
        )
        
        # TwiML for the call logic
        twiml_content = f'<Response><Say voice="alice">{message}</Say></Response>'

        if self.client and self.from_number and self.doctor_number:
            print(f"[AGENT ACTION] Initiating REAL Twilio call to {self.doctor_number}...")
            try:
                call = self.client.calls.create(
                    to=self.doctor_number,
                    from_=self.from_number,
                    twiml=twiml_content
                )
                print(f"OK: Call initiated successfully. SID: {call.sid}")
                return True
            except Exception as e:
                print(f"ERROR: Error making Twilio call: {e}")
                return False
        else:
            print("WARNING: [AGENT ACTION] DRY RUN: Missing Twilio credentials. Simulation mode.")
            print(f"--- Faked Call Content ---")
            print(f"From: {self.from_number or 'DEMO_NUMBER'}")
            print(f"To: {self.doctor_number or 'DOCTOR_NUMBER'}")
            print(f"Message: {message}")
            print(f"--------------------------")
            return True

# Singleton instance
call_service = CallService()
