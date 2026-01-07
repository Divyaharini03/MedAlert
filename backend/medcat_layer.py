import os
from typing import Dict, List

try:
  # MedCAT imports – all CPU friendly
  from medcat.cat import CAT
  from medcat.utils.models import load_model_pack
except Exception as exc:  # pragma: no cover - import guard
  CAT = None  # type: ignore
  load_model_pack = None  # type: ignore
  print(f"MedCAT not available: {exc}")


class MedCATExtractor:
  """
  Lightweight wrapper around MedCAT for symptom / clinical-entity extraction.

  Responsibilities:
  - Load MedCAT model locally on CPU
  - Extract explicitly mentioned clinical entities from raw text
  - Return only names + concept IDs (no risk scoring, no advice)
  """

  def __init__(self) -> None:
    self.cat = None

    if CAT is None or load_model_pack is None:
      # MedCAT is not installed; extractor will return empty results.
      print("MedCATExtractor: medcat not installed, running in no-op mode.")
      return

    # Model pack path can be configured via env var; otherwise use a default location.
    model_path = os.getenv("MEDCAT_MODEL_PACK", os.path.join("models", "medcat_model"))
    try:
      print(f"Loading MedCAT model pack from: {model_path}")
      self.cat = load_model_pack(model_path)
      # Ensure CPU-only
      if hasattr(self.cat, "device"):
        self.cat.device = "cpu"
      print("MedCAT model loaded.")
    except Exception as exc:
      print(f"Failed to load MedCAT model pack: {exc}")
      self.cat = None

  def extract_symptoms(self, text: str) -> Dict[str, List[str]]:
    """
    Returns:
    {
      "symptoms": [list of symptom / entity names],
      "concept_ids": [list of UMLS/SNOMED IDs]
    }

    If MedCAT or model are unavailable, returns empty lists.
    """
    if not text or not text.strip() or self.cat is None:
      return {"symptoms": [], "concept_ids": []}

    try:
      doc = self.cat.get_entities(text)
    except Exception as exc:
      print(f"MedCAT extraction error: {exc}")
      return {"symptoms": [], "concept_ids": []}

    names: List[str] = []
    concept_ids: List[str] = []

    for ent in doc.ents:
      cui = getattr(ent._, "cui", None)
      name = ent.text.strip()
      if not name or not cui:
        continue
      names.append(name)
      concept_ids.append(cui)

    # De-duplicate while preserving order
    def _uniq(seq: List[str]) -> List[str]:
      seen = set()
      out: List[str] = []
      for x in seq:
        if x not in seen:
          seen.add(x)
          out.append(x)
      return out

    return {
      "symptoms": _uniq(names),
      "concept_ids": _uniq(concept_ids),
    }


# Singleton-style instance for use in the main pipeline
medcat_extractor = MedCATExtractor()

