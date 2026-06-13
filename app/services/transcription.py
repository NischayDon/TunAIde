import requests
import base64
import os
import json
from app.core.config import settings


class TranscriptionService:
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = "https://openrouter.ai/api/v1"
        self.model_id = settings.OPENROUTER_MODEL

        if self.api_key:
            print(f"TranscriptionService initialized with OpenRouter model: {self.model_id}")
        else:
            print("WARNING: OPENROUTER_API_KEY not set. Transcription will use mock data.")

    def transcribe_audio(self, file_path: str):
        """
        Transcribes the audio file using OpenRouter's audio transcription API.
        Returns the transcript text.
        """
        if not self.api_key:
            # Fallback for dev/testing without keys
            print("WARNING: OpenRouter API Key missing. Returning mock transcript.")
            return {
                "text": "This is a simulated transcript (Mock) because no API key was provided. The system is working correctly.\nThis is the second segment of the mock transcription to demonstrate the system.",
                "metadata": {
                    "mock": True,
                    "duration": 42.0,
                    "segments": []
                }
            }

        try:
            # 1. Read and base64-encode the audio file
            print(f"Reading audio file: {file_path}")
            with open(file_path, "rb") as f:
                audio_data = base64.b64encode(f.read()).decode("utf-8")

            file_size = os.path.getsize(file_path)
            print(f"File size: {file_size} bytes")

            if file_size == 0:
                raise Exception("Audio file is 0 bytes. Logic error in file handling.")

            # Determine audio format from extension
            ext = file_path.rsplit(".", 1)[-1].lower() if "." in file_path else "mp3"
            format_map = {
                "mp3": "mp3", "wav": "wav", "flac": "flac",
                "m4a": "m4a", "ogg": "ogg", "webm": "webm",
                "mp4": "mp4", "mpeg": "mpeg",
            }
            audio_format = format_map.get(ext, "mp3")

            # 2. Call OpenRouter audio transcription endpoint
            print(f"Sending to OpenRouter ({self.model_id})...")
            response = requests.post(
                f"{self.base_url}/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model_id,
                    "input_audio": {
                        "data": audio_data,
                        "format": audio_format,
                    },
                },
                timeout=300,  # 5 minute timeout for large files
            )

            if response.status_code != 200:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get("error", {}).get("message", response.text)
                except Exception:
                    pass
                raise Exception(f"OpenRouter API error ({response.status_code}): {error_detail}")

            result = response.json()
            plain_text = result.get("text", "").strip()

            if not plain_text:
                raise Exception("OpenRouter returned empty transcription.")

            print(f"Transcription received: {len(plain_text)} characters")

            # OpenRouter Whisper does not return timestamps/segments,
            # so we return empty segments. The frontend handles this gracefully.
            return {
                "text": plain_text,
                "metadata": {
                    "duration": 0,
                    "model": self.model_id,
                    "segments": []
                }
            }

        except Exception as e:
            print(f"Transcription error: {e}")
            raise e


transcription_service = TranscriptionService()
