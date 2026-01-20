from typing import Any, Dict, List
from call_service import call_service

"""
Autonomous Action Layer for MedAlert.

Responsibilities:
- Execute real-world side effects based on high-risk signals.
- Stay completely separate from Whisper, MedCAT, PubMedBERT, and rule logic.
- Be triggered programmatically via the backend only.
"""

_emergency_already_triggered: bool = False


async def executeEmergencyAction(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute emergency actions based on structured risk context.
    Returns status dictionary.
    """
    global _emergency_already_triggered

    risk = str(context.get("risk", "")).lower()
    confidence_raw = context.get("confidence", 0.0)
    print(f"DEBUG: Action Executor received context with risk={risk}, confidence={confidence_raw}")
    try:
        confidence = float(confidence_raw)
    except (TypeError, ValueError):
        confidence = 0.0

    # For testing/demo, we allow multiple calls. 
    # In production, you would add a more sophisticated debounce (e.g., once per hour per patient).

    if risk != "high" or confidence < 0.7:
        print("AGENT ACTION NOT EXECUTED: conditions not met.")
        return {"status": "ignored", "reason": "risk_or_confidence_too_low"}

    _emergency_already_triggered = True

    symptoms: List[str] = context.get("symptoms") or []
    reason = context.get("reason", "unspecified_reason")

    # ---- Real Action Layer (Twilio) ----
    print("=== AGENT ACTION EXECUTED ===")
    success = call_service.make_emergency_call(reason, symptoms)
    
    if success:
        print(f"Reason: {reason}")
        print(f"Symptoms: {symptoms}")
        print(f"Confidence: {confidence}")
        
        # Determine if it was a real call or dry run
        is_dry_run = not (call_service.account_sid and call_service.auth_token)
        return {
            "status": "success", 
            "is_dry_run": is_dry_run,
            "message": "Twilio call initiated" if not is_dry_run else "DRY RUN: Call simulated"
        }
    else:
        print("Failed to execute emergency call.")
        return {"status": "error", "message": "Twilio call failed"}
    print("================================")

