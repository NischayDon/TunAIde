"""
Quick script to verify OpenRouter API connectivity and list available models.
Usage: python check_models.py
"""
import os
import sys
import requests
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv()

from app.core.config import settings


def check_openrouter():
    api_key = settings.OPENROUTER_API_KEY
    if not api_key or api_key == "your-openrouter-api-key-here":
        print("Error: OPENROUTER_API_KEY not set in .env")
        return

    print(f"Using API Key: {api_key[:8]}...{api_key[-4:]}")
    print(f"Configured Model: {settings.OPENROUTER_MODEL}")

    try:
        # Check available models
        res = requests.get(
            "https://openrouter.ai/api/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )

        if res.status_code != 200:
            print(f"Failed to list models: {res.status_code} - {res.text}")
            return

        models = res.json().get("data", [])
        print(f"\n--- Found {len(models)} models ---")

        # Check if our configured model exists
        configured = settings.OPENROUTER_MODEL
        found = any(m["id"] == configured for m in models)

        if found:
            print(f"\n✓ Configured model '{configured}' is available.")
        else:
            print(f"\n✗ Configured model '{configured}' NOT found!")
            # Show similar models
            similar = [m["id"] for m in models if "whisper" in m["id"].lower()]
            if similar:
                print(f"  Similar models: {', '.join(similar)}")

    except Exception as e:
        print(f"Failed to connect to OpenRouter: {e}")


if __name__ == "__main__":
    check_openrouter()
