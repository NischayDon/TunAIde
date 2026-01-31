from google import genai
from google.genai import types
from app.core.config import settings
import os
import time
import json
import shutil

class TranscriptionService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
            self.model_id = "gemini-2.0-flash" # Updated to latest stable flash model
        else:
            self.client = None

    def transcribe_audio(self, file_path: str):
        """
        Transcribes the audio file using Google Gemini API.
        Returns the transcript text.
        """
        if not self.client:
            # Fallback for dev/testing without keys
            print("WARNING: Gemini API Key missing. Returning mock transcript.")
            return {
                "text": "This is a simulated transcript from Gemini (Mock) because no API key was provided. The system is working correctly.\nThis is the second segment of the mock transcription to demonstrate timestamps.",
                "metadata": {
                    "mock": True, 
                    "duration": 42.0,
                    "segments": [
                        {"start": "00:00", "end": "00:05", "text": "This is a simulated transcript from Gemini (Mock) because no API key was provided."},
                        {"start": "00:05", "end": "00:10", "text": "The system is working correctly."},
                        {"start": "00:10", "end": "00:15", "text": "This is the second segment of the mock transcription to demonstrate timestamps."}
                    ]
                }
            }

        try:
            print(f"Uploading file {file_path} to Gemini...")
            
            # 1. Upload the file
            # The new SDK handles mime-types automatically or via config, 
            # but usually just 'client.files.upload' is enough.
            # However, for stability, we can specify if needed.
            
            # NOTE: New SDK uses 'client.files.upload'
            upload_result = self.client.files.upload(path=file_path)
            
            file_name = upload_result.name
            
            # 2. Wait for processing
            while upload_result.state.name == "PROCESSING":
                print("Waiting for audio file processing...")
                time.sleep(1)
                upload_result = self.client.files.get(name=file_name)

            print(f"File State: {upload_result.state.name}")
            if upload_result.state.name == "FAILED":
                raise Exception("Audio file processing failed on Gemini side.")

            print("Generating transcript...")
            
            # 3. Generate Content with Config
            prompt = """
            Transcribe the audio file. 
            Return a JSON object in the following format:
            {
                "segments": [
                    {"start": "MM:SS", "end": "MM:SS", "text": "transcription segment..."}
                ]
            }
            1. The "text" field must contain ONLY the spoken words. Do NOT include the timestamp in the "text" field.
            2. The "start" and "end" timestamps must be formatted as MM:SS.
            3. Return ONLY the JSON object.
            """

            # New SDK generation call
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[
                    upload_result,
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    safety_settings=[
                        types.SafetySetting(
                            category="HARM_CATEGORY_HARASSMENT",
                            threshold="BLOCK_NONE"
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_HATE_SPEECH",
                            threshold="BLOCK_NONE"
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold="BLOCK_NONE"
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold="BLOCK_NONE"
                        ),
                    ]
                )
            )
            
            # 4. Parse Response
            transcript_data = {}
            plain_text = ""
            
            try:
                # The response.text should be JSON string now due to response_mime_type
                text_response = response.text
                transcript_data = json.loads(text_response)
                
                # Construct plain text from segments
                if "segments" in transcript_data:
                    plain_text = "\n".join([seg["text"] for seg in transcript_data["segments"]])
                else:
                    # Fallback if structure is slightly off
                    plain_text = text_response
                    
            except Exception as e:
                print(f"Failed to parse JSON response: {e}")
                plain_text = response.text
                transcript_data = {"segments": [], "raw": response.text}

            # 5. Cleanup (Optional, but polite)
            # self.client.files.delete(name=file_name)
            
            return {
                "text": plain_text,
                "metadata": {
                    "duration": 0, 
                    "model": self.model_id,
                    "segments": transcript_data.get("segments", [])
                }
            }
        except Exception as e:
            print(f"Transcription error: {e}")
            raise e

transcription_service = TranscriptionService()
