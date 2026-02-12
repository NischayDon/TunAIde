import os
import sys
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.getcwd())

# Load environment variables
load_dotenv()

try:
    from google import genai
except ImportError:
    print("google-genai not installed. Please install it.")
    sys.exit(1)

from app.core.config import settings

def list_models():
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        print("Error: GEMINI_API_KEY not found in settings/env.")
        return

    print(f"Using API Key: {api_key[:5]}...{api_key[-4:]}")
    
    try:
        client = genai.Client(api_key=api_key)
        print("\n--- Available Gemini Models ---")
        models = list(client.models.list())
        found_3 = False
        
        for m in models:
            # Inspection for debugging
            # print(dir(m)) 
            
            # The attribute might be different in this SDK version
            methods = getattr(m, "supported_generation_methods", [])
            
            # Print ALL models that look like gems
            if "gemini" in m.name.lower():
                 print(f"ID: {m.name}")
                 print(f"   Display Name: {m.display_name}")
                 print(f"   Supported Methods: {methods}")
                 print("-" * 30)

            if "gemini-3" in m.name.lower():
                found_3 = True

        if not found_3:
            print("\nWARNING: No 'gemini-3' models found in the list.")
            print("Usage Note: Some new models require 'gemini-experimental' or specific -exp versions.")

    except Exception as e:
        print(f"Failed to list models: {e}")

if __name__ == "__main__":
    list_models()
