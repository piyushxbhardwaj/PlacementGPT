import re
import logging
from typing import Tuple

logger = logging.getLogger("placementgpt")

# Common prompt injection and jailbreak regex patterns
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(?:all\s+)?previous\s+instructions",
    r"system\s+prompt\s*(?:reveal|show|print|output|display|expose)",
    r"you\s+are\s+now\s+an?\s+unrestricted",
    r"new\s+rule\s*:",
    r"bypass\s+restrictions",
    r"dan\s+mode",
    r"jailbreak",
    r"sql\s+injection|drop\s+table|delete\s+from\s+users",
    r"delete\s+database",
    r"forget\s+what\s+you\s+were\s+told",
]

class RAGGuardrails:
    @staticmethod
    def sanitize_input(text: str) -> str:
        """Sanitizes user input to remove dangerous special characters and HTML formatting."""
        if not text:
            return ""
        # Remove HTML tags
        cleaned = re.sub(r"<[^>]*>", "", text)
        # Strip trailing/leading whitespaces
        return cleaned.strip()

    @staticmethod
    def inspect_query(query: str) -> Tuple[bool, str]:
        """
        Inspects the query for prompt injection, jailbreaks, or malicious queries.
        Returns:
            Tuple[bool, str]: (is_safe, explanation_if_unsafe)
        """
        sanitized = RAGGuardrails.sanitize_input(query)
        
        # Check against blacklist patterns
        for pattern in PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, sanitized, re.IGNORECASE):
                logger.warning(f"Guardrails triggered: Query matched prompt injection pattern '{pattern}'")
                return False, "Query blocked: Potential prompt injection or jailbreak detected."
        
        # Length check (prevent buffer overflows or extremely heavy requests)
        if len(sanitized) > 1500:
            logger.warning("Guardrails triggered: Query exceeds maximum allowed length.")
            return False, "Query blocked: Input text is too long (maximum 1500 characters)."
            
        return True, ""
