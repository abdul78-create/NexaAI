#!/usr/bin/env python3
"""
NexaAI Production Secret Generator Script
Generates cryptographically secure random secret keys for application deployment.
"""

import secrets
import sys


def generate_secret(length_bytes: int = 32) -> str:
    """Generate a URL-safe cryptographically strong secret token."""
    return secrets.token_urlsafe(length_bytes)


def main() -> None:
    print("=" * 60)
    print("NexaAI Production Secret Generator")
    print("=" * 60)
    print("Generate random 256-bit secrets for production environment setup.")
    print()

    app_secret = generate_secret(32)
    jwt_secret = generate_secret(32)
    pg_password = generate_secret(24)

    print(f"SECRET_KEY={app_secret}")
    print(f"JWT_SECRET_KEY={jwt_secret}")
    print(f"POSTGRES_PASSWORD={pg_password}")
    print()
    print("Instructions:")
    print("1. Copy the generated secrets into your production .env file.")
    print("2. NEVER commit the .env file or real secrets to version control.")
    print("=" * 60)


if __name__ == "__main__":
    main()
