import pyotp
import secrets
import hashlib
from typing import List

class TOTPService:
    def __init__(self, issuer_name: str = "Scrapi"):
        self.issuer_name = issuer_name

    def generate_secret(self, email: str) -> dict:
        """Generates a base32 secret and provisioning URI for Google Authenticator."""
        secret = pyotp.random_base32()
        uri = self.generate_uri(secret, email)
        return {"secret": secret, "uri": uri}

    def generate_uri(self, secret: str, email: str) -> str:
        """Generates a provisioning URI for an existing secret."""
        return pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name=self.issuer_name)

    def verify_token(self, secret: str, token: str) -> bool:
        """Verifies a 6-digit TOTP token against the secret."""
        if not secret or not token:
            return False
        totp = pyotp.TOTP(secret)
        # Allow 1 window before and after (30s grace period) for slight clock drifts
        return totp.verify(token, valid_window=1)

    def generate_recovery_codes(self, num_codes: int = 10) -> dict:
        """Generates raw recovery codes and their hashed versions to store in DB."""
        raw_codes = []
        hashed_codes = []
        for _ in range(num_codes):
            # Generate a 10-character alphanumeric code
            code = secrets.token_hex(5)
            raw_codes.append(code)
            # Hash it to store safely
            hashed = hashlib.sha256(code.encode()).hexdigest()
            hashed_codes.append(hashed)
            
        return {"raw_codes": raw_codes, "hashed_codes": hashed_codes}

    def verify_recovery_code(self, hashed_codes: List[str], input_code: str) -> bool:
        """Verifies if an input code matches any of the stored hashed codes."""
        input_hash = hashlib.sha256(input_code.encode()).hexdigest()
        return input_hash in hashed_codes
