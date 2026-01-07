import os
from call_service import call_service
from dotenv import load_dotenv

def test_emergency_call():
    load_dotenv()
    print("--- MedAlert Twilio Test Script ---")
    
    # Check if .env is populated
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    if not sid or "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" in sid:
        print("❌ Error: You haven't filled in your TWILIO_ACCOUNT_SID in the .env file.")
        print("Please follow the setup guide and update backend/.env")
        return

    reason = "Test Emergency"
    symptoms = ["Testing Twilio integration", "Real-world calling check"]
    
    print(f"Triggering test call for reason: {reason}...")
    success = call_service.make_emergency_call(reason, symptoms)
    
    if success:
        print("\n✅ Test sequence finished.")
        if os.getenv("TWILIO_ACCOUNT_SID"):
             print("If you didn't see 'DRY RUN' in the output, the call was sent to Twilio!")
    else:
        print("\n❌ Test failed. Check the error messages above.")

if __name__ == "__main__":
    test_emergency_call()
