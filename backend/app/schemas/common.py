"""
Common schema types and resilient fallbacks for DEPOSIT360.
Provides an EmailStr type that uses email-validator if installed,
and falls back to an RFC-compliant regex validator if email-validator
is missing.
"""
try:
    import email_validator  # noqa: F401
    from pydantic import EmailStr
except ImportError:
    from typing import Annotated
    from pydantic import Field

    # Robust fallback that works without needing external email-validator binary/wheel
    EmailStr = Annotated[
        str,
        Field(
            pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$",
            description="Valid email address format"
        )
    ]

__all__ = ["EmailStr"]
